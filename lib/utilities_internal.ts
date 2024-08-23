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

/**
 * @internal
 */
export function generateClientString(): string {
  // Grab the various versions.  Note that we need to trim them
  // off as some Node.js versions insert strange characters into
  // the version identifiers (mainly newlines and such).
  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const couchnodeVer = require('../package.json').version.trim()
  const nodeVer = process.versions.node.trim()
  const v8Ver = process.versions.v8.trim()
  const sslVer = process.versions.openssl.trim()

  return `couchnode/${couchnodeVer} (node/${nodeVer}; v8/${v8Ver}; ssl/${sslVer})`
}
