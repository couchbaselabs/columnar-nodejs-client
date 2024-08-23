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

'use strict'

const assert = require('assert')
const harness = require('./harness')

const H = harness

describe('#Cluster', function () {
  it('should correctly set timeouts', function () {
    let options = {
      timeoutOptions: {
        connectTimeout: 20000,
        dispatchTimeout: 40000,
        managementTimeout: 80000,
        queryTimeout: 80000,
        resolveTimeout: 30000,
      },
    }

    const cluster = H.lib.Cluster.createInstance(
      H.connStr,
      H.credentials,
      options
    )

    assert.equal(cluster.bootstrapTimeout, 20000)
    assert.equal(cluster.dispatchTimeout, 40000)
    assert.equal(cluster.managementTimeout, 80000)
    assert.equal(cluster.queryTimeout, 80000)
    assert.equal(cluster.resolveTimeout, 30000)
  })

  it('should error ops after close and ignore superfluous closes', async function () {
    this.skip() // TODO: Query after cluster.close() hangs

    H.skipIfIntegrationDisabled()
    const cluster = H.lib.Cluster.createInstance(H.connStr, H.credentials)
    const scope = cluster.database(H.databaseName).scope(H.scopeName)

    await scope.executeQuery("SELECT 'Hello Earth!' AS message")

    await cluster.close()
    await cluster.close()
    await cluster.close()
    await cluster.close()

    await H.throwsHelper(async () => {
      await scope.executeQuery("SELECT 'Hello Mars!' AS message")
    }, Error)

    await cluster.close()
    await cluster.close()
  })
})
