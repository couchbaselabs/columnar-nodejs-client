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
