/* eslint jsdoc/require-jsdoc: off */
import { QueryOptions, QueryResult } from './querytypes'
import { errorFromCpp, queryScanConsistencyToCpp } from './bindingutilities'
import { Cluster } from './cluster'
import { JsonDeserializer } from './deserializers'
import { CppColumnarQueryResult } from './binding'

/**
 * @internal
 */
export class QueryExecutor {
  private _cluster: Cluster
  private _databaseName: string | undefined
  private _scopeName: string | undefined

  /**
   * @internal
   */
  constructor(cluster: Cluster, databaseName?: string, scopeName?: string) {
    this._cluster = cluster
    this._databaseName = databaseName
    this._scopeName = scopeName
  }

  /**
   * @internal
   */
  query(statement: string, options: QueryOptions): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const deserializer = options.deserializer || new JsonDeserializer()
      const timeout = options.timeout || this._cluster.queryTimeout
      let resp: CppColumnarQueryResult | undefined

      this._cluster.conn.query(
        {
          statement: statement,
          database_name: this._databaseName,
          scope_name: this._scopeName,
          priority: options.priority,
          positional_parameters:
            options.positionalParameters
              ? options.positionalParameters.map((v) => JSON.stringify(v ?? null))
              : [],
          named_parameters:
            options.namedParameters
              ? Object.fromEntries(
                  Object.entries(options.namedParameters as { [key: string]: any })
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
        (res, cppErr) => {
          resp = res
          const err = errorFromCpp(cppErr)
          if (err) {
            reject(err)
            return
          }
          resolve(new QueryResult(resp, deserializer))
        }
      )
    })
  }
}
