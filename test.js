const columnar = require('./dist/columnar')

async function main() {
    // Update this to your cluster
    const clusterConnStr = 'couchbases://cb.uirhtmnethsy0l5d.customsubdomain.nonprod-project-avengers.com'
    const username = 'testuser'
    const password = 'P@ssw0rd_12345!'
    // User Input ends here.

    const credential = new columnar.Credential(username, password)
    const cluster = columnar.createInstance(clusterConnStr, 
      credential, {
      timeoutOptions: {
        queryTimeout: 10000,
        connectTimeout: 2000,
        dispatchTimeout: 5000
      },
      securityOptions: {
        trustOnlyCertificates: columnar.Certificates.getNonprodCertificates()
      }
    })

    const qs = "SELECT * FROM `travel-sample`.inventory.airline LIMIT 10;"
    const res = await cluster.executeQuery(qs)
    for await (let row of res.rows()) {
      console.log(row)
    }
    console.log(res.metadata())

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

//
