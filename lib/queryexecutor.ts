/*
 *  Copyright 2016-2024. Couchbase, Inc.
 *  All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/* eslint jsdoc/require-jsdoc: off */
import {
  QueryMetadata,
  QueryMetrics,
  QueryOptions,
  QueryResult,
} from './querytypes'
import { errorFromCpp, queryScanConsistencyToCpp } from './bindingutilities'
import { Cluster } from './cluster'
import { CppColumnarQueryResult, CppColumnarError } from './binding'
import { OperationCanceledError } from './errors'

/**
 * @internal
 */
enum StreamingState {
  NotStarted = 0,
  Started,
  Cancelled,
  Complete,
}

/**
 * @internal
 */
export class QueryExecutor {
  private _cluster: Cluster
  private _databaseName: string | undefined
  private _scopeName: string | undefined
  private _coreQueryResult: CppColumnarQueryResult | undefined
  private _streamingState: StreamingState
  private _abortController: AbortController
  private _signal: AbortSignal

  /**
   * @internal
   */
  constructor(
    cluster: Cluster,
    signal?: AbortSignal,
    databaseName?: string,
    scopeName?: string
  ) {
    this._cluster = cluster
    this._databaseName = databaseName
    this._scopeName = scopeName
    this._streamingState = StreamingState.NotStarted

    this._abortController = new AbortController()
    this._signal = signal
      ? AbortSignal.any([this._abortController.signal, signal])
      : this._abortController.signal

    this._signal.addEventListener('abort', () => {
      this.handleAbort()
    })
  }

  /**
  @internal
  */
  get coreQueryResult(): CppColumnarQueryResult | undefined {
    return this._coreQueryResult
  }

  /**
  @internal
  */
  get streamingState(): StreamingState {
    return this._streamingState
  }

  /**
  @internal
  */
  get abortSignal(): AbortSignal {
    return this._signal
  }

  /**
   * @internal
   */
  handleAbort(): void {
    if (!this._signal.aborted) {
      this._abortController.abort()
    }

    if (!this._coreQueryResult) {
      return
    }

    if (
      ![StreamingState.Cancelled, StreamingState.Complete].includes(
        this._streamingState
      ) &&
      this._coreQueryResult.cancel()
    ) {
      this._streamingState = StreamingState.Cancelled
    }
  }

  /**
   * @internal
   */
  triggerAbort(): void {
    this._abortController.abort()
  }

  /**
   * @internal
   */
  streamingComplete(): void {
    this._streamingState = StreamingState.Complete
  }

  /**
   * @internal
   */
  metadata(): QueryMetadata {
    const metadata = this._coreQueryResult?.metadata()
    if (!metadata) {
      throw new Error(
        'Metadata is only available once all rows have been iterated'
      )
    }
    return new QueryMetadata({
      requestId: metadata.request_id,
      warnings: metadata.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
      })),
      metrics: new QueryMetrics({
        elapsedTime: metadata.metrics.elapsed_time,
        executionTime: metadata.metrics.execution_time,
        resultCount: metadata.metrics.result_count,
        resultSize: metadata.metrics.result_size,
        processedObjects: metadata.metrics.processed_objects,
      }),
    })
  }

  /**
   * @internal
   */
  getNextRow(
    callback: (row: string, err: CppColumnarError | null) => void
  ): void {
    this._coreQueryResult?.nextRow(callback)
  }

  /**
   * @internal
   */
  query(statement: string, options: QueryOptions): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const deserializer = options.deserializer || this._cluster.deserializer
      const timeout = options.timeout || this._cluster.queryTimeout

      const { cppQueryErr, cppQueryResult } = this._cluster.conn.query(
        {
          statement: statement,
          database_name: this._databaseName,
          scope_name: this._scopeName,
          priority: options.priority,
          positional_parameters: options.positionalParameters
            ? options.positionalParameters.map((v) => JSON.stringify(v ?? null))
            : [],
          named_parameters: options.namedParameters
            ? Object.fromEntries(
                Object.entries(
                  options.namedParameters as { [key: string]: any }
                )
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => [k, JSON.stringify(v)])
              )
            : {},
          read_only: options.readOnly,
          scan_consistency: queryScanConsistencyToCpp(options.scanConsistency),
          raw: options.raw
            ? Object.fromEntries(
                Object.entries(options.raw)
                  .filter(([, v]) => v !== undefined)
                  .map(([k, v]) => [k, JSON.stringify(v)])
              )
            : {},
          timeout: timeout,
        },
        (cppErr) => {
          const err = errorFromCpp(cppErr)
          if (err && !(err instanceof OperationCanceledError)) {
            reject(err)
            return
          }
          try {
            // this will raise an error w/ the coreQueryResult is null
            const qRes = new QueryResult(this, deserializer)
            resolve(qRes)
          } catch (err) {
            reject(err)
          }
        }
      )

      const err = errorFromCpp(cppQueryErr)
      if (err) {
        throw err
      }

      this._coreQueryResult = cppQueryResult
      this._streamingState = StreamingState.Started
    })
  }
}
