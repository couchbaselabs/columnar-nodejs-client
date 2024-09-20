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

import { CppConnection } from './binding'
import { Database } from './database'
import { Cluster } from './cluster'
import { QueryOptions, QueryResult } from './querytypes'
import { QueryExecutor } from './queryexecutor'

/**
 * Volatile: This API is subject to change at any time.
 *
 * Exposes the operations which are available to be performed against a scope.
 * Namely, the ability to access to Collections for performing operations.
 *
 * @category Core
 */
export class Scope {
  private _database: Database
  private _name: string
  private _conn: CppConnection

  /**
  @internal
  */
  constructor(database: Database, scopeName: string) {
    this._database = database
    this._name = scopeName
    this._conn = database.conn
  }

  /**
  @internal
  */
  get conn(): CppConnection {
    return this._conn
  }

  /**
  @internal
  */
  get database(): Database {
    return this._database
  }

  /**
  @internal
  */
  get cluster(): Cluster {
    return this._database.cluster
  }

  /**
   * Executes a query against the Columnar scope.
   *
   * @param statement The columnar SQL++ statement to execute.
   * @param options Optional parameters for this operation.
   */
  executeQuery(
    statement: string,
    options?: QueryOptions
  ): Promise<QueryResult> {
    if (!options) {
      options = {}
    }

    if (options.timeout && options.timeout < 0) {
      throw new Error('timeout must be non-negative.')
    }

    const exec = new QueryExecutor(
      this.cluster,
      options.abortSignal,
      this._database.name,
      this._name
    )
    return exec.query(statement, options)
  }

  /**
   * The name of the scope this Scope object references.
   */
  get name(): string {
    return this._name
  }
}
