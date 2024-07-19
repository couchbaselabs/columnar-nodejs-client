import binding from './binding'
import { Credential } from './credential'
import { Cluster, ClusterOptions } from './cluster'

/**
 * Acts as the entrypoint into the rest of the library.  Connecting to the cluster
 * and exposing the various services and features.
 *
 * @param connStr The connection string to use to connect to the cluster.
 * @param credential The credential details to use to connect to the cluster.
 * @param options Optional parameters for this operation.
 * @category Core
 */
export function createInstance(
  connStr: string,
  credential: Credential,
  options?: ClusterOptions
): Cluster {
  return Cluster.createInstance(connStr, credential, options)
}

/**
 * Exposes the underlying couchbase++ library version that is being used by the
 * SDK to perform I/O with the cluster.
 */
export const cbppVersion: string = binding.cbppVersion
export const cbppMetadata: string = binding.cbppMetadata

/**
 * Volatile: This API is subject to change at any time.
 *
 * Exposes the underlying couchbase++ library protocol logger.  This method is for
 * logging/debugging purposes and must be used with caution as network details will
 * be logged to the provided file.
 *
 * @param filename Name of file protocol logger will save logging details.
 */
export function enableProtocolLoggerToSaveNetworkTrafficToFile(
  filename: string
): void {
  binding.enableProtocolLogger(filename)
}

/**
 * Volatile: This API is subject to change at any time.
 *
 * Shutdowns the underlying couchbase++ logger.
 *
 */
export function shutdownLogger(): void {
  binding.shutdownLogger()
}

export * from './querytypes'
export * from './database'
export * from './deserializers'
export * from './certificates'
export * from './cluster'
export * from './credential'
export * from './errors'
export * from './scope'
export * from './streamablepromises'

export { NodeCallback } from './utilities'
