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
