import { CppConnection } from './binding'
import { Cluster } from './cluster'
import { Scope } from './scope'

/**
 * Volatile: This API is subject to change at any time.
 *
 * Exposes the operations which are available to be performed against a database.
 * Namely, the ability to access to Scopes as well as performing management
 * operations against the database.
 *
 * @category Core
 */
export class Database {
  private _cluster: Cluster
  private _name: string
  private _conn: CppConnection

  /**
   @internal
   */
  constructor(cluster: Cluster, databaseName: string) {
    this._cluster = cluster
    this._name = databaseName
    this._conn = cluster.conn
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
  get cluster(): Cluster {
    return this._cluster
  }

  /**
   * The name of the database this Database object references.
   */
  get name(): string {
    return this._name
  }

  /**
   * Creates a Scope object reference to a specific scope.
   *
   * @param scopeName The name of the scope to reference.
   */
  scope(scopeName: string): Scope {
    return new Scope(this, scopeName)
  }
}
