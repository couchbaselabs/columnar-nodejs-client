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
