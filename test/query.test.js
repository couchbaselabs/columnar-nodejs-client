'use strict'

const assert = require('chai').assert
const H = require('./harness')

const { QueryScanConsistency } = require('../lib/querytypes')
const {
  PassthroughDeserializer,
  JsonDeserializer,
} = require('../lib/deserializers')

describe('#columnar', function () {
  before(async function () {
    H.skipIfIntegrationDisabled(this)
  })

  it('should successfully stream rows with cluster query', async function () {
    let results = []
    const qs = `FROM RANGE(1, 100) AS i SELECT *`
    let res = await H.c.executeQuery(qs)
    for await (const row of res.rows()) {
      results.push(row)
    }
    assert.equal(results.length, 100)
  })

  it('should use the passthrough deserializer', async function () {
    let jsonRows = []
    let passthroughRows = []

    const qs = `SELECT 1=1`
    let jsonRes = await H.c.executeQuery(qs, {
      deserializer: new JsonDeserializer(),
    })
    let passthroughRes = await H.c.executeQuery(qs, {
      deserializer: new PassthroughDeserializer(),
    })
    for await (const row of jsonRes.rows()) {
      jsonRows.push(row)
    }
    for await (const row of passthroughRes.rows()) {
      passthroughRows.push(row)
    }

    assert.equal(jsonRows.length, 1)
    assert.equal(passthroughRows.length, 1)
    assert.isObject(jsonRows.at(0))
    assert.isString(passthroughRows.at(0))
  })

  it('should successfully stream rows with scope query', async function () {
    let results = []
    const qs = `FROM RANGE(1, 100) AS i SELECT *`
    let res = await H.s.executeQuery(qs)
    for await (const row of res.rows()) {
      results.push(row)
    }
    assert.equal(results.length, 100)
  })

  it('should work with multiple options', async function () {
    const results = []
    const qs = `SELECT $five=5`

    let res = await H.c.executeQuery(qs, {
      parameters: {
        five: 5,
      },
      readOnly: true,
      scanConsistency: QueryScanConsistency.NotBounded,
      priority: true,
    })

    for await (const row of res.rows()) {
      results.push(row)
    }

    assert.equal(results.length, 1)
    assert.isTrue(results.at(0)['$1'])
  })

  it('should work with positional parameters', async function () {
    const results = []
    const qs = `SELECT $2=1`

    let res = await H.c.executeQuery(qs, {
      parameters: [undefined, 1],
    })

    for await (const row of res.rows()) {
      results.push(row)
    }

    assert.equal(results.length, 1)
    assert.isTrue(results.at(0)['$1'])
  })

  it('should fetch all databases', async function () {
    const results = []
    const qs = `SELECT RAW {\`DatabaseName\`, \`SystemDatabase\`}
        FROM \`System\`.\`Metadata\`.\`Database\``

    let res = await H.c.executeQuery(qs)

    for await (const row of res.rows()) {
      results.push(row)
    }

    assert.isAtLeast(results.length, 2)

    const testDatabase = results.find((db) => db.DatabaseName === H.d.name)
    const systemDatabase = results.find((db) => db.DatabaseName === 'System')

    assert.isNotNull(systemDatabase)
    assert.isNotNull(testDatabase)
    assert.isTrue(systemDatabase['SystemDatabase'])
    assert.isFalse(testDatabase['SystemDatabase'])
  })

  it('should fetch all scopes', async function () {
    const results = []
    const qs = `SELECT RAW \`DataverseName\`
        FROM \`System\`.\`Metadata\`.\`Dataverse\`
        WHERE \`DatabaseName\` = ?`

    let res = await H.c.executeQuery(qs, {
      parameters: [H.d.name],
    })

    for await (const row of res.rows()) {
      results.push(row)
    }

    const testScope = results.find((scope) => scope === H.s.name)

    assert.isNotNull(testScope)
    assert.isAtLeast(results.length, 1)
  })
})
