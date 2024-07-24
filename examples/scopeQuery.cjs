const columnar = require("couchbase-columnar")

async function main() {
  // Update this to your cluster
  const clusterConnStr = 'couchbases://--your-instance--'
  const username = 'username'
  const password = 'P@ssw0rd_12345!'
  // User Input ends here.

  const credential = new columnar.Credential(username, password)
  const scope = columnar
    .createInstance(clusterConnStr, credential, {
      securityOptions: {
        trustOnlyCertificates: columnar.Certificates.getNonprodCertificates(),
      },
    })
    .database("travel-sample")
    .scope("inventory")

  // Execute a streaming query with positional arguments.
  let qs = "SELECT * FROM airline LIMIT 10;"
  let res = await scope.executeQuery(qs)
  for await (let row of res.rows()) {
    console.log("Found row: ", row)
  }
  console.log("Metadata: ", res.metadata())

  // Execute a streaming query with positional arguments.
  qs = "SELECT * FROM airline WHERE country=$1 LIMIT $2;"
  res = await scope.executeQuery(qs, { parameters: ["United States", 10] })
  for await (let row of res.rows()) {
    console.log("Found row: ", row)
  }
  console.log("Metadata: ", res.metadata())

  // Execute a streaming query with named parameters.
  qs = "SELECT * FROM airline WHERE country=$country LIMIT $limit;"
  res = await scope.executeQuery(qs, {
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
