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

export { NodeCallback } from './utilities'
