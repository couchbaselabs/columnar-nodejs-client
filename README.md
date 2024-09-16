# Couchbase Node.js Columnar Client
Node.js client for [Couchbase](https://couchbase.com) Columnar

>**IMPORTANT:** This client is currently under active development and the API is subject to change.

# Installing the SDK<a id="installing-the-sdk"></a>

Eventually the SDK will be published to npm, but in the interim a select set of packages with prebuilt binaries are available on the [Releases page](https://github.com/couchbaselabs/columnar-nodejs-client/releases).  If a packages is not available for your specific platform, see the [BUILDING page](https://github.com/couchbaselabs/columnar-nodejs-client/blob/main/BUILDING.md) for details on how to build the SDK's binary.

To install the SDK from a prebuilt-binary (a.k.a. prebuild) on the [Releases page](https://github.com/couchbaselabs/columnar-nodejs-client/releases):
1. Download the appropriate package
2. Unzip the downloaded file
3. Install via npm: `npm install <path to unzipped prebuild>`

If a compatible package is not available, the SDK's binary will need to be built from source:
1. Follow the steps on the [BUILDING page](https://github.com/couchbaselabs/columnar-nodejs-client/blob/main/BUILDING.md)
2. After the build succeeds, the SDK can be used by running Node scripts from within the cloned repository or the SDK can be installed via pip: `npm install <path to cloned repository>`

# Using the SDK<a id="using-the-sdk"></a>

## CommonJS
**Connecting and executing a query**
```javascript
const columnar = require('couchbase-columnar')

async function main() {
  // Update this to your cluster
  const clusterConnStr = 'couchbases://--your-instance--'
  const username = 'username'
  const password = 'P@ssw0rd_12345!'
  // User Input ends here.

  const credential = new columnar.Credential(username, password)
  const cluster = columnar.createInstance(clusterConnStr, credential, {
    securityOptions: {
      trustOnlyCertificates: columnar.Certificates.getNonprodCertificates(),
    },
  })

  // Execute a streaming query with positional arguments.
  let qs = 'SELECT * FROM `travel-sample`.inventory.airline LIMIT 10;'
  let res = await cluster.executeQuery(qs)
  for await (let row of res.rows()) {
    console.log('Found row: ', row)
  }
  console.log('Metadata: ', res.metadata())

  // Execute a streaming query with positional arguments.
  qs =
    'SELECT * FROM `travel-sample`.inventory.airline WHERE country=$1 LIMIT $2;'
  res = await cluster.executeQuery(qs, { parameters: ['United States', 10] })
  for await (let row of res.rows()) {
    console.log('Found row: ', row)
  }
  console.log('Metadata: ', res.metadata())

  // Execute a streaming query with named parameters.
  qs =
    'SELECT * FROM `travel-sample`.inventory.airline WHERE country=$country LIMIT $limit;'
  res = await cluster.executeQuery(qs, {
    parameters: { country: 'United States', limit: 10 },
  })
  for await (let row of res.rows()) {
    console.log('Found row: ', row)
  }
  console.log('Metadata: ', res.metadata())
}

main()
  .then(() => {
    console.log('Finished.  Exiting app...')
  })
  .catch((err) => {
    console.log('ERR: ', err)
    console.log('Exiting app...')
    process.exit(1)
  })

```

## ES Modules
**Connecting and executing a query**
```javascript
import { Certificates, Credential, createInstance } from "couchbase-columnar"

async function main() {
  // Update this to your cluster
  const clusterConnStr = 'couchbases://--your-instance--'
  const username = 'username'
  const password = 'P@ssw0rd_12345!'
  // User Input ends here.

  const credential = new Credential(username, password)
  const cluster = createInstance(clusterConnStr, credential, {
    securityOptions: {
      trustOnlyCertificates: Certificates.getNonprodCertificates(),
    },
  })

  // Execute a streaming query with positional arguments.
  let qs = "SELECT * FROM `travel-sample`.inventory.airline LIMIT 10;"
  let res = await cluster.executeQuery(qs)
  for await (let row of res.rows()) {
    console.log("Found row: ", row)
  }
  console.log("Metadata: ", res.metadata())

  // Execute a streaming query with positional arguments.
  qs =
    "SELECT * FROM `travel-sample`.inventory.airline WHERE country=$1 LIMIT $2;"
  res = await cluster.executeQuery(qs, { parameters: ["United States", 10] })
  for await (let row of res.rows()) {
    console.log("Found row: ", row)
  }
  console.log("Metadata: ", res.metadata())

  // Execute a streaming query with named parameters.
  qs =
    "SELECT * FROM `travel-sample`.inventory.airline WHERE country=$country LIMIT $limit;"
  res = await cluster.executeQuery(qs, {
    parameters: { country: "United States", limit: 10 },
  })
  for await (let row of res.rows()) {
    console.log("Found row: ", row)
  }
  console.log("Metadata: ", res.metadata())
}

main()
  .then(() => {
    console.log("Finished.  Exiting app...")
  })
  .catch((err) => {
    console.log("ERR: ", err)
    console.log("Exiting app...")
    process.exit(1)
  })

```