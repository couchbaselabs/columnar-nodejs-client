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

const path = require('path')
const prebuilds = require('./prebuilds')

if (hasLocalPrebuild()) {
  const destination = path.join(
    path.resolve(__dirname, '..'),
    'build',
    'Release'
  )
  const source = getLocalPrebuild()
  // on either success or failure of resolving local prebuild we still confirm we have a prebuild
  prebuilds.resolveLocalPrebuild(source, destination).then(installPrebuild())
} else {
  installPrebuild()
}

function getLocalPrebuild() {
  const localPrebuildsName = `npm_config_columnar_local_prebuilds`
  return process.env[localPrebuildsName]
}

function hasLocalPrebuild() {
  return typeof getLocalPrebuild() === 'string'
}

function installPrebuild() {
  try {
    prebuilds.resolvePrebuild(path.resolve(__dirname, '..'), {
      runtimeResolve: false,
    })
    process.exit(0)
  } catch (err) {
    prebuilds.buildBinary()
  }
}
