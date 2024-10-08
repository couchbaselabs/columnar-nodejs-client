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

import { Deserializer } from './deserializers'
import { QueryExecutor } from './queryexecutor'
import { Readable } from 'stream'
import { errorFromCpp } from './bindingutilities'

/**
 * Contains the results of a columnar query.
 *
 * @category Query
 */
export class QueryResult {
  private _executor: QueryExecutor
  private _stream: QueryResultStream

  /**
   * @internal
   */
  constructor(executor: QueryExecutor, deserializer: Deserializer) {
    this._executor = executor
    if (!executor.coreQueryResult) {
      throw new Error('Missing core QueryResult.')
    }
    this._stream = new QueryResultStream(this._executor, deserializer)
  }

  /**
   * Returns a [Readable](https://nodejs.org/api/stream.html#readable-streams) stream of rows returned from the Columnar query.
   */
  rows(): QueryResultStream {
    return this._stream
  }

  /**
   * Volatile: This API is subject to change at any time.
   * 
   * Cancel streaming the query results.
   */
  cancel(): void {
    this._executor.triggerAbort()
  }

  /**
   * The metadata returned from the query. Only becomes available once all rows have been iterated.
   *
   * @throws {Error} If it is called before all rows have been iterated.
   */
  metadata(): QueryMetadata {
    return this._executor.metadata()
  }
}

/**
 * @internal
 */
export class QueryResultStream extends Readable {
  private _executor: QueryExecutor
  private _deserializer: Deserializer

  constructor(executor: QueryExecutor, deserializer: Deserializer) {
    super({
      objectMode: true,
      autoDestroy: false,
      signal: executor.abortSignal,
    })
    this._executor = executor
    this._deserializer = deserializer
  }

  /**
   * @inheritDoc
   */
  pause(): this {
    super.pause()
    return this
  }

  /**
   * @inheritDoc
   */
  resume(): this {
    super.resume()
    return this
  }

  /**
   * @inheritDoc
   */
  setEncoding(encoding: BufferEncoding): this {
    super.setEncoding(encoding)
    return this
  }

  /**
   * @inheritDoc
   */
  unpipe(destination?: NodeJS.WritableStream): this {
    super.unpipe(destination)
    return this
  }

  /**
   * @inheritDoc
   */
  wrap(stream: NodeJS.ReadableStream): this {
    super.wrap(stream)
    return this
  }

  /**
   * @internal
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override _read(size: number): void {
    this._executor.getNextRow((row, cppErr) => {
      const err = errorFromCpp(cppErr)
      if (err) {
        return this.destroy(err)
      }

      if (typeof row === 'undefined') {
        this.push(null)
        this._executor.streamingComplete()
        return
      }

      this.push(this._deserializer.deserialize(row))
    })
  }

  /**
   * @internal
   */
  override _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void
  ): void {
    // Lets not send the AbortError to the callback
    if (error && error.name !== 'AbortError') {
      callback(error)
    }
    callback(null)
  }
}

/**
 * Contains the meta-data that is returned from a query.
 *
 * @category Query
 */
export class QueryMetadata {
  /**
   * The request ID which is associated with the executed query.
   */
  requestId: string

  /**
   * Any warnings that occurred during the execution of the query.
   */
  warnings: QueryWarning[]

  /**
   * Various metrics which are made available by the query engine.
   */
  metrics: QueryMetrics

  /**
   * @internal
   */
  constructor(data: QueryMetadata) {
    this.requestId = data.requestId
    this.warnings = data.warnings
    this.metrics = data.metrics
  }
}

/**
 * Contains information about a warning which occurred during the
 * execution of an analytics query.
 *
 * @category Query
 */
export class QueryWarning {
  /**
   * The numeric code associated with the warning which occurred.
   */
  code: number

  /**
   * A human-readable representation of the warning which occurred.
   */
  message: string

  /**
   * @internal
   */
  constructor(data: QueryWarning) {
    this.code = data.code
    this.message = data.message
  }
}

/**
 * Contains various metrics that are returned by the server following
 * the execution of an analytics query.
 *
 * @category Query
 */
export class QueryMetrics {
  /**
   * The total amount of time spent running the query, in milliseconds.
   */
  elapsedTime: number

  /**
   * The total amount of time spent executing the query, in milliseconds.
   */
  executionTime: number

  /**
   * The total number of rows which were part of the result set.
   */
  resultCount: number

  /**
   * The total number of bytes which were generated as part of the result set.
   */
  resultSize: number

  /**
   * The total number of objects that were processed as part of execution of the query.
   */
  processedObjects: number

  /**
   * @internal
   */
  constructor(data: QueryMetrics) {
    this.elapsedTime = data.elapsedTime
    this.executionTime = data.executionTime
    this.resultCount = data.resultCount
    this.resultSize = data.resultSize
    this.processedObjects = data.processedObjects
  }
}

/**
 * Represents the various scan consistency options that are available when
 * querying against columnar.
 *
 * @category Query
 */
export enum QueryScanConsistency {
  /**
   * Indicates that no specific consistency is required, this is the fastest
   * options, but results may not include the most recent operations which have
   * been performed.
   */
  NotBounded = 'not_bounded',

  /**
   * Indicates that the results to the query should include all operations that
   * have occurred up until the query was started.  This incurs a performance
   * penalty of waiting for the index to catch up to the most recent operations,
   * but provides the highest level of consistency.
   */
  RequestPlus = 'request_plus',
}

/**
 * @category Query
 */
export interface QueryOptions {
  /**
   * Positional values to be used for the placeholders within the query.
   */
  positionalParameters?: any[]

  /**
   * Named values to be used for the placeholders within the query.
   */
  namedParameters?: { [key: string]: any }

  /**
   * Specifies the consistency requirements when executing the query.
   *
   * @see AnalyticsScanConsistency
   */
  scanConsistency?: QueryScanConsistency

  /**
   * Indicates whether this query should be executed with a specific priority level.
   */
  priority?: boolean

  /**
   * Indicates whether this query should be executed in read-only mode.
   */
  readOnly?: boolean

  /**
   * Specifies any additional parameters which should be passed to the query engine
   * when executing the query.
   */
  raw?: { [key: string]: any }

  /**
   * The timeout for this operation, represented in milliseconds.
   */
  timeout?: number

  /**
   * Sets the deserializer used by {@link QueryResult.rows } to convert query result rows into objects.
   * If not specified, defaults to the cluster's default deserializer.
   */
  deserializer?: Deserializer

  /**
   * Sets an abort signal for the query allowing the operation to be cancelled.
   */
  abortSignal?: AbortSignal
}
