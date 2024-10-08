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

import fs from 'fs'
import * as path from 'path'

/**
 * @internal
 */
export class Certificates {
  /**
   * @internal
   */
  public static getNonprodCertificates(): string[] {
    const basePath = path.resolve(path.dirname(__filename), '..')
    const certPath = path.join(basePath, 'dist', 'nonProdCertificates')
    const certificates: string[] = []
    fs.readdirSync(certPath).forEach((fileName) => {
      certificates.push(fs.readFileSync(path.join(certPath, fileName), 'utf-8'))
    })
    return certificates
  }
}
