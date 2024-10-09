# Couchbase Node.js Columnar Client
Node.js client for [Couchbase](https://couchbase.com) Columnar

# Installing the SDK<a id="installing-the-sdk"></a>

Install the SDK via `npm`:
```console
npm install couchbase-columnar
```

# Installing the SDK from source

If a compatible prebuild is not available, the SDK's binary will need to be built from source:

1. Follow the steps on the [BUILDING page](https://github.com/couchbaselabs/columnar-nodejs-client/blob/main/BUILDING.md)
2. After the build succeeds, the SDK can be used by running Node scripts from within the cloned repository or the SDK can be installed via pip: `npm install <path to cloned repository>`

# Using the SDK<a id="using-the-sdk"></a>

Some more examples are provided in the [examples directory](https://github.com/couchbaselabs/columnar-nodejs-client/tree/main/examples).

## CommonJS
**Connecting and executing a query**
```javascript
const columnar = require('couchbase-columnar')

async function main() {
  // Update this to your cluster
  const clusterConnStr = 'couchbases://--your-instance--'
  const username = 'username'
  const password = 'password'
  // User Input ends here.

  const credential = new columnar.Credential(username, password)
  const cluster = columnar.createInstance(clusterConnStr, credential)

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
    namedParameters: { country: 'United States', limit: 10 },
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
  const password = 'password'
  // User Input ends here.

  const credential = new Credential(username, password)
  const cluster = createInstance(clusterConnStr, credential)

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
    namedParameters: { country: "United States", limit: 10 },
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