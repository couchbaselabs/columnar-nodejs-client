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

import { Certificates, Credential, createInstance } from 'couchbase-columnar'

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

  // Execute a streaming query.
  let qs = 'SELECT * FROM `travel-sample`.inventory.airline LIMIT 10;'
  let res = await cluster.executeQuery(qs)
  for await (let row of res.rows()) {
    console.log('Found row: ', row)
  }
  console.log('Metadata: ', res.metadata())

  // Execute a streaming query with positional arguments.
  qs =
    'SELECT * FROM `travel-sample`.inventory.airline WHERE country=$1 LIMIT $2;'
  res = await cluster.executeQuery(qs, {
    positionalParameters: ['United States', 10],
  })
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
