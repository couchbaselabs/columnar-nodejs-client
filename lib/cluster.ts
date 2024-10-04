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

import { Credential } from './credential'
import binding, {
  CppClusterCredentials,
  CppClusterSecurityOptions,
  CppConnection,
} from './binding'
import { knownProfiles } from './configProfile'
import { ConnSpec } from './connspec'
import { PromiseHelper, NodeCallback } from './utilities'
import { generateClientString } from './utilities_internal'
import { Database } from './database'
import { Deserializer, JsonDeserializer } from './deserializers'
import { InvalidArgumentError } from './errors'
import { QueryOptions, QueryResult } from './querytypes'
import { QueryExecutor } from './queryexecutor'

/**
 * Specifies the timeout options for the client.
 *
 * @category Core
 */
export interface TimeoutOptions {
  /**
   * Specifies the default timeout allocated to complete bootstrap connection, specified in millseconds.
   */
  connectTimeout?: number

  /**
   * Specifies the default timeout allocated to complete HTTP connection prior to sending requests, specified in millseconds.
   */
  dispatchTimeout?: number

  /**
   * Specifies the default timeout for management operations, specified in millseconds.
   */
  managementTimeout?: number

  /**
   * Specifies the default timeout for query operations, specified in millseconds.
   */
  queryTimeout?: number

  /**
   * Specifies the default timeout to resolve hostname of the node to IP address, specified in millseconds.
   */
  resolveTimeout?: number

  /**
   * Specifies the default timeout to complete creating socket connection to resolved IP, specified in millseconds.
   */
  socketConnectTimeout?: number
}

/**
 * Specifies security options for the client.
 *
 * @category Core
 */
export interface SecurityOptions {
  /**
   * Specifies the SDK will only trust the Capella CA certificate(s).
   */
  trustOnlyCapella?: boolean

  /**
   * Specifies the SDK will only trust the PEM-encoded certificate(s)
   * at the specified file path.
   */
  trustOnlyPemFile?: string

  /**
   * Specifies the SDK will only trust the PEM-encoded certificate(s)
   * in the specified string.
   */
  trustOnlyPemString?: string

  /**
   * Specifies the SDK will only trust the PEM-encoded certificate(s)
   * specified.
   */
  trustOnlyCertificates?: string[]

  /**
   * Specifies the SDK will only trust the platform certificate(s).
   */
  trustOnlyPlatform?: boolean

  /**
   * If disabled, SDK will trust any certificate regardless of validity.
   * Should not be disabled in production environments.
   */
  disableServerCertificateVerification?: boolean
}

/**
 * Specifies DNS options for the client.
 *
 * Volatile: This API is subject to change at any time.
 *
 * @category Core
 */
export interface DnsConfig {
  /**
   * Specifies the nameserver to be used for DNS query when connecting.
   */
  nameserver?: string

  /**
   * Specifies the port to be used for DNS query when connecting.
   */
  port?: number

  /**
   * Specifies the default timeout for DNS SRV operations, specified in millseconds.
   */
  dnsSrvTimeout?: number | string
}

/**
 * Specifies the options which can be specified when connecting
 * to a cluster.
 *
 * @category Core
 */
export interface ClusterOptions {
  /**
   * Specifies the security options for connections of this cluster.
   */
  securityOptions?: SecurityOptions

  /**
   * Specifies the default timeouts for various operations performed by the SDK.
   */
  timeoutOptions?: TimeoutOptions

  /**
   * Specifies the DNS config for connections of this cluster.
   *
   * Volatile: This API is subject to change at any time.
   *
   */
  dnsConfig?: DnsConfig

  /**
   * Applies the specified ConfigProfile options to the cluster.
   *
   * Volatile: This API is subject to change at any time.
   *
   */
  configProfile?: string

  /**
   * Sets the default deserializer for converting query result rows into objects.
   * If not specified, the SDK uses an instance of the default {@link JsonDeserializer}.
   *
   * Can also be set per-operation with {@link QueryOptions.deserializer}.
   */
  deserializer?: Deserializer
}

/**
 * Exposes the operations which are available to be performed against a cluster.
 * Namely, the ability to access to Databases as well as performing management
 * operations against the cluster.
 *
 * @category Core
 */
export class Cluster {
  private _connStr: string
  private _queryTimeout: number | undefined
  private _managementTimeout: number | undefined
  private _connectTimeout: number | undefined
  private _bootstrapTimeout: number | undefined
  private _resolveTimeout: number | undefined
  private _dispatchTimeout: number | undefined
  private _credential: Credential
  private _securityOptions: SecurityOptions
  private _conn: CppConnection
  private _dnsConfig: DnsConfig | null
  private _deserializer: Deserializer

  /**
   * @internal
   */
  get conn(): CppConnection {
    return this._conn
  }

  /**
  @internal
  */
  get queryTimeout(): number | undefined {
    return this._queryTimeout
  }

  /**
  @internal
  */
  get managementTimeout(): number | undefined {
    return this._managementTimeout
  }

  /**
  @internal
  */
  get bootstrapTimeout(): number | undefined {
    return this._bootstrapTimeout
  }

  /**
  @internal
  */
  get connectTimeout(): number | undefined {
    return this._connectTimeout
  }

  /**
  @internal
  */
  get resolveTimeout(): number | undefined {
    return this._resolveTimeout
  }

  /**
  @internal
  */
  get dispatchTimeout(): number | undefined {
    return this._dispatchTimeout
  }

  /**
  @internal
  */
  get deserializer(): Deserializer {
    return this._deserializer
  }

  /**
  @internal
  @deprecated Use the static sdk-level {@link createInstance} method instead.
  */
  constructor(
    connStr: string,
    credential: Credential,
    options?: ClusterOptions
  ) {
    if (!options) {
      options = {}
    }

    if (!options.securityOptions) {
      this._securityOptions = { trustOnlyCapella: true }
    } else {
      this._securityOptions = options.securityOptions
    }

    if (!options.timeoutOptions) {
      options.timeoutOptions = {}
    } else {
      this._validateTimeoutOptions(options.timeoutOptions)
    }

    this._connStr = connStr

    if (options.configProfile) {
      knownProfiles.applyProfile(options.configProfile, options)
    }

    this._queryTimeout = options.timeoutOptions.queryTimeout
    this._managementTimeout = options.timeoutOptions.managementTimeout
    this._dispatchTimeout = options.timeoutOptions.dispatchTimeout
    this._bootstrapTimeout = options.timeoutOptions?.connectTimeout
    this._connectTimeout = options.timeoutOptions?.socketConnectTimeout
    this._resolveTimeout = options.timeoutOptions?.resolveTimeout
    this._deserializer = options.deserializer || new JsonDeserializer()

    this._credential = credential

    if (
      options.dnsConfig &&
      (options.dnsConfig.nameserver ||
        options.dnsConfig.port ||
        options.dnsConfig.dnsSrvTimeout)
    ) {
      this._dnsConfig = {
        nameserver: options.dnsConfig.nameserver,
        port: options.dnsConfig.port,
        dnsSrvTimeout: options.dnsConfig.dnsSrvTimeout,
      }
    } else {
      this._dnsConfig = null
    }

    this._conn = new binding.Connection()
  }

  /**
  @internal
  */
  static createInstance(
    connStr: string,
    credential: Credential,
    options?: ClusterOptions
  ): Cluster {
    const cluster = new Cluster(connStr, credential, options)
    cluster._connect()
    return cluster
  }

  /**
   * Volatile: This API is subject to change at any time.
   *
   * Creates a database object reference to a specific database.
   *
   * @param databaseName The name of the database to reference.
   */
  database(databaseName: string): Database {
    return new Database(this, databaseName)
  }

  /**
   * Executes a query against the Columnar cluster.
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

    const exec = new QueryExecutor(this, options.abortSignal)
    return exec.query(statement, options)
  }

  /**
   * Shuts down this cluster object.  Cleaning up all resources associated with it.
   *
   * @param callback A node-style callback to be invoked after execution.
   */
  async close(callback?: NodeCallback<void>): Promise<void> {
    return PromiseHelper.wrap((wrapCallback) => {
      this._conn.shutdown(() => {
        wrapCallback(null)
      })
    }, callback)
  }

  /**
   * @internal
   */
  private _validateTimeoutOptions(timeoutOptions: TimeoutOptions): void {
    if (timeoutOptions.connectTimeout && timeoutOptions.connectTimeout < 0) {
      throw new Error('connectTimeout must be non-negative.')
    }

    if (timeoutOptions.dispatchTimeout && timeoutOptions.dispatchTimeout < 0) {
      throw new Error('dispatchTimeout must be non-negative.')
    }

    if (
      timeoutOptions.managementTimeout &&
      timeoutOptions.managementTimeout < 0
    ) {
      throw new Error('managementTimeout must be non-negative.')
    }

    if (timeoutOptions.queryTimeout && timeoutOptions.queryTimeout < 0) {
      throw new Error('queryTimeout must be non-negative.')
    }

    if (timeoutOptions.resolveTimeout && timeoutOptions.resolveTimeout < 0) {
      throw new Error('resolveTimeout must be non-negative.')
    }

    if (
      timeoutOptions.socketConnectTimeout &&
      timeoutOptions.socketConnectTimeout < 0
    ) {
      throw new Error('socketConnectTimeout must be non-negative.')
    }
  }

  private _connect() {
    const dsnObj = ConnSpec.parse(this._connStr)

    dsnObj.options.user_agent_extra = generateClientString()

    // if the timeout value is not already in the connstr and provided in the TimeoutConfig
    // pass it to the C++ core via the connstr.  Need to use golang syntax for correct parsing.

    // Remember the translations in the C++ core:
    // bootstrapTimeout == columnar connection_timeout (which is bootstrap_timeout in C++ core)
    if (
      !('timeout.connect_timeout' in dsnObj.options) &&
      this.bootstrapTimeout
    ) {
      dsnObj.options['timeout.connect_timeout'] =
        `${this.bootstrapTimeout.toString()}ms`
    }
    // connectTimeout == columnar socket_connect_timeout (which is connect_timeout in C++ core)
    if (
      !('timeout.socket_connect_timeout' in dsnObj.options) &&
      this.connectTimeout
    ) {
      dsnObj.options['timeout.socket_connect_timeout'] =
        `${this.connectTimeout.toString()}ms`
    }
    if (!('timeout.resolve_timeout' in dsnObj.options) && this.resolveTimeout) {
      dsnObj.options['timeout.resolve_timeout'] =
        `${this.resolveTimeout.toString()}ms`
    }
    if (
      !('timeout.dispatch_timeout' in dsnObj.options) &&
      this.dispatchTimeout
    ) {
      dsnObj.options['timeout.dispatch_timeout'] =
        `${this.dispatchTimeout.toString()}ms`
    }
    if (!('timeout.query_timeout' in dsnObj.options) && this.queryTimeout) {
      dsnObj.options['timeout.query_timeout'] =
        `${this.queryTimeout.toString()}ms`
    }

    if (
      'timeout.dns_srv_timeout' in dsnObj.options &&
      typeof dsnObj.options['timeout.dns_srv_timeout'] === 'string'
    ) {
      if (!this._dnsConfig) {
        this._dnsConfig = {}
      }
      this._dnsConfig.dnsSrvTimeout = dsnObj.options['timeout.dns_srv_timeout']
      delete dsnObj.options['timeout.dns_srv_timeout']
    }

    const authOpts: CppClusterCredentials = {}

    if (this._credential) {
      authOpts.username = this._credential.username
      authOpts.password = this._credential.password
    }
    // columnar default for SASL mechanism
    authOpts.allowed_sasl_mechanisms = ['PLAIN']

    const securityOpts: CppClusterSecurityOptions = {}
    if (
      !('security.trust_only_pem_file' in dsnObj.options) &&
      this._securityOptions
    ) {
      const trustOptionsCount =
        (this._securityOptions.trustOnlyCapella ? 1 : 0) +
        (this._securityOptions.trustOnlyPemFile ? 1 : 0) +
        (this._securityOptions.trustOnlyPemString ? 1 : 0) +
        (this._securityOptions.trustOnlyPlatform ? 1 : 0) +
        (this._securityOptions.trustOnlyCertificates ? 1 : 0)

      if (trustOptionsCount > 1) {
        throw new InvalidArgumentError(
          'Only one of trustOnlyCapella, trustOnlyPemFile, trustOnlyPemString, trustOnlyPlatform, or trustOnlyCertificates can be set.'
        )
      }

      if (this._securityOptions.trustOnlyCapella) {
        securityOpts.trustOnlyCapella = true
      } else if (this._securityOptions.trustOnlyPemFile) {
        securityOpts.trustOnlyCapella = false
        securityOpts.trustOnlyPemFile = this._securityOptions.trustOnlyPemFile
      } else if (this._securityOptions.trustOnlyPemString) {
        securityOpts.trustOnlyCapella = false
        securityOpts.trustOnlyPemString =
          this._securityOptions.trustOnlyPemString
      } else if (this._securityOptions.trustOnlyPlatform) {
        securityOpts.trustOnlyCapella = false
        securityOpts.trustOnlyPlatform = true
      } else if (this._securityOptions.trustOnlyCertificates) {
        securityOpts.trustOnlyCapella = false
        securityOpts.trustOnlyCertificates =
          this._securityOptions.trustOnlyCertificates
      } else {
        // TODO: log warning?
        securityOpts.trustOnlyCapella = true
      }
      if (
        typeof this._securityOptions.disableServerCertificateVerification ===
          'boolean' &&
        this._securityOptions.disableServerCertificateVerification &&
        !('security.disable_server_certificate_verification' in dsnObj.options)
      ) {
        dsnObj.options['security.disable_server_certificate_verification'] =
          'true'
      }
    } else if (!('security.trust_only_pem_file' in dsnObj.options)) {
      securityOpts.trustOnlyCapella = true
    } else {
      securityOpts.trustOnlyCapella = false
    }

    const connStr = dsnObj.toString()
    try {
      this._conn.connect(connStr, authOpts, securityOpts, this._dnsConfig)
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid option')) {
        throw new InvalidArgumentError(err.message)
      }
      throw err
    }
  }
}
