/**
 * DataReady AI — Android APK Installer
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { ADB_PATH } = require('../config/capabilities')

const APK_PATH = path.resolve(__dirname, '../../testing/dataready-ai-preview-cleartext.apk')
const DEVICE_ID = '00092349L001564'

function installApk() {
  console.log(`[APK Installer] Target device: ${DEVICE_ID}`)
  console.log(`[APK Installer] APK file: ${APK_PATH}`)

  if (!fs.existsSync(APK_PATH)) {
    throw new Error(`APK file not found at: ${APK_PATH}`)
  }

  console.log('[APK Installer] Installing APK with -r (reinstall)...')
  const out = execSync(`"${ADB_PATH}" -s ${DEVICE_ID} install -r "${APK_PATH}"`, { encoding: 'utf8' })
  console.log(`[APK Installer] Output: ${out.trim()}`)
}

if (require.main === module) {
  try {
    installApk()
  } catch (err) {
    console.error(`[APK Installer Error] ${err.message}`)
    process.exit(1)
  }
}

module.exports = { installApk }
