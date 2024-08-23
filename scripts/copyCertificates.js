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

const fs = require('fs')
const path = require('path')

CERTIFICATE_DIR = path.join(
  path.resolve(__dirname, '..'),
  'lib',
  'nonProdCertificates'
)
DIST_CERTIFICATE_DIR = path.join(
  path.resolve(__dirname, '..'),
  'dist',
  'nonProdCertificates'
)
let files = fs.readdirSync(CERTIFICATE_DIR)

if (files.length > 0 && !fs.existsSync(DIST_CERTIFICATE_DIR)) {
  fs.mkdirSync(DIST_CERTIFICATE_DIR, { recursive: true })
}

for (let i = 0; i < files.length; i++) {
  if (fs.statSync(path.join(CERTIFICATE_DIR, files[i])).isFile()) {
    fs.copyFileSync(
      path.join(CERTIFICATE_DIR, files[i]),
      path.join(DIST_CERTIFICATE_DIR, files[i])
    )
  }
}
