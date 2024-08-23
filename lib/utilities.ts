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

import * as qs from 'querystring'

/**
 * Reprents a node-style callback which receives an optional error or result.
 *
 * @category Utilities
 */
export interface NodeCallback<T> {
  (err: Error | null, result: T | null): void
}

/**
 * @internal
 */
export class PromiseHelper {
  /**
   * @internal
   */
  static wrapAsync<T, U extends Promise<T>>(
    fn: () => U,
    callback?: (err: Error | null, result: T | null) => void
  ): U {
    // If a callback in in use, we wrap the promise with a handler which
    // forwards to the callback and return undefined.  If there is no
    // callback specified.  We directly return the promise.
    if (callback) {
      const prom = fn()
      prom
        .then((res) => callback(null, res))
        .catch((err) => callback(err, null))
      return prom
    }

    return fn()
  }

  /**
   * @internal
   */
  static wrap<T>(
    fn: (callback: NodeCallback<T>) => void,
    callback?: NodeCallback<T> | null
  ): Promise<T> {
    const prom: Promise<T> = new Promise((resolve, reject) => {
      fn((err, res) => {
        if (err) {
          reject(err as Error)
        } else {
          resolve(res as T)
        }
      })
    })

    if (callback) {
      prom
        .then((res) => callback(null, res))
        .catch((err) => callback(err, null))
    }

    return prom
  }
}

/**
 * @internal
 */
export class CompoundTimeout {
  private _start: [number, number]
  private _timeout: number | undefined

  /**
   * @internal
   */
  constructor(timeout: number | undefined) {
    this._start = process.hrtime()
    this._timeout = timeout
  }

  /**
   * @internal
   */
  left(): number | undefined {
    if (this._timeout === undefined) {
      return undefined
    }

    const period = process.hrtime(this._start)

    const periodMs = period[0] * 1e3 + period[1] / 1e6
    if (periodMs > this._timeout) {
      return 0
    }

    return this._timeout - periodMs
  }

  /**
   * @internal
   */
  expired(): boolean {
    const timeLeft = this.left()
    if (timeLeft === undefined) {
      return false
    }

    return timeLeft <= 0
  }
}

/**
 * @internal
 */
export function cbQsStringify(
  values: { [key: string]: any },
  options?: { boolAsString?: boolean }
): string {
  const cbValues: { [key: string]: any } = {}
  for (const i in values) {
    if (values[i] === undefined) {
      // skipped
    } else if (typeof values[i] === 'boolean') {
      if (options && options.boolAsString) {
        cbValues[i] = values[i] ? 'true' : 'false'
      } else {
        cbValues[i] = values[i] ? 1 : 0
      }
    } else {
      cbValues[i] = values[i]
    }
  }
  return qs.stringify(cbValues)
}
