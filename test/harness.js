'use strict'

const assert = require('chai').assert
const uuid = require('uuid')
const semver = require('semver')
const columnar = require('../lib/columnar')

try {
  const SegfaultHandler = require('segfault-handler')
  SegfaultHandler.registerHandler()
} catch (e) {
  // segfault-handler is just a helper, its not required
}

const ServerFeatures = {}

class ServerVersion {
  constructor(major, minor, patch) {
    this.major = major
    this.minor = minor
    this.patch = patch
  }

  isAtLeast(major, minor, patch) {
    if (this.major === 0 && this.minor === 0 && this.patch === 0) {
      // if no version is provided, assume latest
      return true
    }

    if (major < this.major) {
      return true
    } else if (major > this.major) {
      return false
    }

    if (minor < this.minor) {
      return true
    } else if (minor > this.minor) {
      return false
    }

    return patch <= this.patch
  }
}

var TEST_CONFIG = {
  connstr: undefined,
  version: new ServerVersion(0, 0, 0),
  database: 'Default',
  scope: 'Default',
  user: undefined,
  pass: undefined,
  features: [],
}

if (process.env.NCBCCCSTR !== undefined) {
  TEST_CONFIG.connstr = process.env.NCBCCCSTR
}
if (process.env.NCBCCCVER !== undefined) {
  assert(!!TEST_CONFIG.connstr, 'must not specify a version without a connstr')
  var ver = process.env.NCBCCCVER
  var major = semver.major(ver)
  var minor = semver.minor(ver)
  var patch = semver.patch(ver)
  TEST_CONFIG.version = new ServerVersion(major, minor, patch)
}
if (process.env.NCBCCDATABASE !== undefined) {
  TEST_CONFIG.database = process.env.NCBCCDATABASE
}
if (process.env.NCBCCSCOPE !== undefined) {
  TEST_CONFIG.scope = process.env.NCBCCSCOPE
}
if (process.env.NCBCCUSER !== undefined) {
  TEST_CONFIG.user = process.env.NCBCCUSER
}
if (process.env.NCBCCPASS !== undefined) {
  TEST_CONFIG.pass = process.env.NCBCCPASS
}
if (process.env.NCBCCFEAT !== undefined) {
  var featureStrs = process.env.NCBCCFEAT.split(',')
  featureStrs.forEach((featureStr) => {
    var featureName = featureStr.substr(1)

    var featureEnabled = undefined
    if (featureStr[0] === '+') {
      featureEnabled = true
    } else if (featureStr[0] === '-') {
      featureEnabled = false
    }

    TEST_CONFIG.features.push({
      feature: featureName,
      enabled: featureEnabled,
    })
  })
}

class Harness {
  get Features() {
    return ServerFeatures
  }

  constructor() {
    this._connstr = TEST_CONFIG.connstr
    this._version = TEST_CONFIG.version
    this._database = TEST_CONFIG.database
    this._scope = TEST_CONFIG.scope
    this._user = TEST_CONFIG.user
    this._pass = TEST_CONFIG.pass
    this._integrationEnabled = true

    if (!this._connstr) {
      console.info(
        'Connection string is not set, integration tests will not be run'
      )
      this._integrationEnabled = false
    }

    this._testKey = uuid.v1().substr(0, 8)
    this._testCtr = 1

    this._testCluster = null
    this._testDatabase = null
    this._testScope = null
  }

  get connStr() {
    return this._connstr
  }

  get databaseName() {
    return this._database
  }

  get scopeName() {
    return this._scope
  }

  get integrationEnabled() {
    return this._integrationEnabled
  }

  get credentials() {
    return {
      username: this._user,
      password: this._pass,
    }
  }

  async throwsHelper(fn) {
    var assertArgs = Array.from(arguments).slice(1)

    var savedErr = null
    try {
      await fn()
    } catch (err) {
      savedErr = err
    }

    assert.throws(
      () => {
        if (savedErr) {
          throw savedErr
        }
      },
      ...assertArgs
    )
  }

  genTestKey() {
    return this._testKey + '_' + this._testCtr++
  }

  async prepare() {
    var cluster = this.newCluster()
    var database = cluster.database(this._database)
    var scope = database.scope(this._scope)
    if (this._integrationEnabled) {
      await this.maybeCreateScope(scope)
    }

    this._testCluster = cluster
    this._testDatabase = database
    this._testScope = scope
  }

  async maybeCreateScope(scope) {
    try {
      await this.maybeCreateDatabase(scope.database)
      const qs = `CREATE SCOPE ${scope.database.name}.${scope.name} IF NOT EXISTS`
      await scope.database.cluster.executeQuery(qs)
    } catch (e) {
      console.warn('Failed maybe creating scope/database: ' + e)
    }
  }

  async maybeCreateDatabase(database) {
    if (database.name !== 'Default') {
      const qs = `CREATE DATABASE ${database.name} IF NOT EXISTS`
      await database.cluster.executeQuery(qs)
    }
  }

  newCluster(options) {
    if (!options) {
      options = {}
    }
    let credential = {}

    if (!options.connstr) {
      options.connstr = this._connstr
    }
    if (!options.username) {
      credential.username = this._user
    }
    if (!options.password) {
      credential.password = this._pass
    }

    return columnar.Cluster.createInstance(options.connstr, credential, {
      securityOptions: {
        trustOnlyCertificates: columnar.Certificates.getNonprodCertificates(),
      },
    })
  }

  async cleanup() {
    this._testDatabase = null
    this._testScope = null

    if (this._testCluster) {
      await this._testCluster.close()
      this._testCluster = null
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  supportsFeature(feature) {
    var featureEnabled = undefined

    TEST_CONFIG.features.forEach((cfgFeature) => {
      if (cfgFeature.feature === '*' || cfgFeature.feature === feature) {
        featureEnabled = cfgFeature.enabled
      }
    })

    if (featureEnabled === true) {
      return true
    } else if (featureEnabled === false) {
      return false
    }

    // eslint-disable-next-line no-empty
    switch (feature) {
    }

    throw new Error('invalid code for feature checking')
  }

  skipIfMissingFeature(test, feature) {
    if (!this.supportsFeature(feature)) {
      /* eslint-disable-next-line mocha/no-skipped-tests */
      test.skip()
      throw new Error('test skipped')
    }
  }

  skipIfIntegrationDisabled(test) {
    if (!this._integrationEnabled) {
      // eslint-disable-next-line mocha/no-skipped-tests
      test.skip()
      throw new Error('test skipped as integration tests are disabled')
    }
  }

  get lib() {
    return columnar
  }

  get c() {
    return this._testCluster
  }
  get d() {
    return this._testDatabase
  }
  get s() {
    return this._testScope
  }
}

var harness = new Harness()

// These are written as normal functions, not async lambdas
// due to our need to specify custom timeouts, which are not
// yet supported on before/after methods yet.
/* eslint-disable-next-line mocha/no-top-level-hooks */
before(function (done) {
  this.timeout(30000)
  harness.prepare().then(done).catch(done)
})
/* eslint-disable-next-line mocha/no-top-level-hooks */
after(function (done) {
  this.timeout(10000)
  harness.cleanup().then(done).catch(done)
})

/* eslint-disable-next-line mocha/no-exports */
module.exports = harness
