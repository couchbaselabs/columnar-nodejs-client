import { Deserializer } from './deserializers'
import { ColumnarError } from './errors'
import { Readable } from 'stream'
import { errorFromCpp } from './bindingutilities'
import { CppColumnarQueryResult } from './binding'

/**
 * Contains the results of a columnar query.
 *
 * @category Analytics
 */
export class QueryResult {
  private _cppResult: CppColumnarQueryResult
  private _deserializer: Deserializer
  private _stream: QueryResultStream

  /**
   * @internal
   */
  constructor(
    cppResult: CppColumnarQueryResult,
    deserializer: Deserializer,
    signal?: AbortSignal
  ) {
    this._cppResult = cppResult
    this._deserializer = deserializer
    this._stream = new QueryResultStream(cppResult, deserializer, signal)
  }

  /**
   * Returns a {@link Readable} stream of rows returned from the Columnar query.
   */
  rows(): QueryResultStream {
    return this._stream
  }

  /**
   * The metadata returned from the query. Only becomes available once all rows have been iterated.
   *
   * @throws {ColumnarError} If it is called before all rows have been iterated.
   */
  metadata(): QueryMetaData {
    const metadata = this._cppResult.metadata()
    if (!metadata) {
      throw new Error(
        'Metadata is only available once all rows have been iterated'
      )
    }
    return {
      requestId: metadata.request_id,
      warnings: metadata.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
      })),
      metrics: {
        elapsedTime: metadata.metrics.elapsed_time,
        executionTime: metadata.metrics.execution_time,
        resultCount: metadata.metrics.result_count,
        resultSize: metadata.metrics.result_size,
        processedObjects: metadata.metrics.processed_objects,
      },
    }
  }
}

/**
 * @internal
 */
export class QueryResultStream extends Readable {
  private _cppResult: CppColumnarQueryResult
  private _deserializer: Deserializer
  private _signal?: AbortSignal

  constructor(
    result: CppColumnarQueryResult,
    deserializer: Deserializer,
    signal?: AbortSignal
  ) {
    super({
      objectMode: true,
      autoDestroy: false,
      signal: signal,
    })
    this._signal = signal
    this._cppResult = result
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
    this._cppResult.nextRow((row, cppErr) => {
      const err = errorFromCpp(cppErr)
      if (err) {
        return this.destroy(err)
      }

      if (typeof row === 'undefined') {
        this.push(null)
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
    if (this._cppResult) {
      this._cppResult.cancel()
    }
    if (error) {
      callback(error)
    }
    callback(null)
  }
}

/**
 * Contains the meta-data that is returned from a query.
 *
 * @category Analytics
 */
export class QueryMetaData {
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
  constructor(data: QueryMetaData) {
    this.requestId = data.requestId
    this.warnings = data.warnings
    this.metrics = data.metrics
  }
}

/**
 * Contains information about a warning which occurred during the
 * execution of an analytics query.
 *
 * @category Analytics
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
 * @category Analytics
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
 * @category Analytics
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
 * @category Analytics
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
}
