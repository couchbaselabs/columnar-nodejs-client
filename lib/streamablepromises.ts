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
import EventEmitter from 'events'

/**
 * @internal
 */
type PromisifyFunc<T> = (
  emitter: StreamablePromise<T>,
  resolve: (result: T) => void,
  reject: (err: Error) => void
) => void

/**
 * @internal
 */
export class StreamablePromise<T> extends EventEmitter implements Promise<T> {
  private _promise: Promise<T> | null = null
  private _promiseifyFn: PromisifyFunc<T>

  /**
   * @internal
   */
  constructor(promisefyFn: PromisifyFunc<T>) {
    super()

    this._promiseifyFn = promisefyFn
  }

  private get promise(): Promise<T> {
    if (!this._promise) {
      this._promise = new Promise((resolve, reject) =>
        this._promiseifyFn(this, resolve, reject)
      )
    }
    return this._promise
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then<TResult1, TResult2>(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult> {
    return this.promise.catch<TResult>(onrejected)
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this.promise.finally(onfinally)
  }

  /**
   * @internal
   */
  get [Symbol.toStringTag](): string {
    return (Promise as any)[Symbol.toStringTag]
  }
}

/**
 * Provides the ability to be used as both a promise, or an event emitter.  Enabling
 * an application to easily retrieve all results using async/await, while also enabling
 * streaming of results by listening for the row and meta events.
 */
export class StreamableRowPromise<T, TRow, TMeta> extends StreamablePromise<T> {
  constructor(fn: (rows: TRow[], meta: TMeta) => T) {
    super((emitter, resolve, reject) => {
      let err: Error | undefined
      const rows: TRow[] = []
      let meta: TMeta | undefined

      emitter.on('row', (r) => rows.push(r))
      emitter.on('meta', (m) => (meta = m))
      emitter.on('error', (e) => (err = e))
      emitter.on('end', () => {
        if (err) {
          return reject(err)
        }

        resolve(fn(rows, meta as TMeta))
      })
    })
  }
}
