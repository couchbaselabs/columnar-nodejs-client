import { Certificates, Credential, createInstance } from "couchbase-columnar";

async function main() {
  // Update this to your cluster
  const clusterConnStr = 'couchbases://--your-instance--'
  const username = 'username'
  const password = 'P@ssw0rd_12345!'
  // User Input ends here.

  const credential = new Credential(username, password);
  const cluster = createInstance(clusterConnStr, credential, {
    timeoutOptions: {
      queryTimeout: 10000,
      connectTimeout: 2000,
      dispatchTimeout: 5000,
    },
    securityOptions: {
      trustOnlyCertificates: Certificates.getNonprodCertificates(),
    },
  });

  // Execute a streaming query with positional arguments.
  let qs = "SELECT * FROM `travel-sample`.inventory.airline LIMIT 10;";
  let res = await cluster.executeQuery(qs);
  for await (let row of res.rows()) {
    console.log("Found row: ", row);
  }
  console.log("Metadata: ", res.metadata());

  // Execute a streaming query with positional arguments.
  qs =
    "SELECT * FROM `travel-sample`.inventory.airline WHERE country=$1 LIMIT $2;";
  res = await cluster.executeQuery(qs, { parameters: ["United States", 10] });
  for await (let row of res.rows()) {
    console.log("Found row: ", row);
  }
  console.log("Metadata: ", res.metadata());

  // Execute a streaming query with named parameters.
  qs =
    "SELECT * FROM `travel-sample`.inventory.airline WHERE country=$country LIMIT $limit;";
  res = await cluster.executeQuery(qs, {
    parameters: { country: "United States", limit: 10 },
  });
  for await (let row of res.rows()) {
    console.log("Found row: ", row);
  }
  console.log("Metadata: ", res.metadata());
}

main()
  .then(() => {
    console.log("Finished.  Exiting app...");
  })
  .catch((err) => {
    console.log("ERR: ", err);
    console.log("Exiting app...");
    process.exit(1);
  });
