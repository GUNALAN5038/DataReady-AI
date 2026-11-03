/**
 * DataReady AI — Android Appium Desired Capabilities & Dynamic Device Discovery
 */

const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

function resolveAdbPath() {
  if (process.env.ADB_PATH && fs.existsSync(process.env.ADB_PATH)) {
    return process.env.ADB_PATH
  }

  const isWin = process.platform === 'win32'
  const adbBin = isWin ? 'adb.exe' : 'adb'

  const candidates = [
    'C:\\platform-tools\\platform-tools\\adb.exe',
    'C:\\platform-tools\\adb.exe',
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools', adbBin) : null,
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', adbBin) : null,
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Check if adb is available on system PATH
  try {
    const cmd = isWin ? 'where adb' : 'which adb'
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const firstLine = out.split('\n')[0].trim()
    if (firstLine && fs.existsSync(firstLine)) {
      return firstLine
    }
  } catch {
    // not in PATH
  }

  return adbBin
}

function getConnectedDevice(adbPath) {
  if (process.env.ANDROID_SERIAL) {
    return process.env.ANDROID_SERIAL.trim()
  }

  try {
    const output = execSync(`"${adbPath}" devices`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    const lines = output.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('List of devices') && !trimmed.startsWith('*')) {
        const parts = trimmed.split(/\s+/)
        if (parts[1] === 'device') {
          return parts[0]
        }
      }
    }
  } catch {
    // ignore
  }

  return null
}

const ADB_PATH = resolveAdbPath()
const DETECTED_DEVICE = getConnectedDevice(ADB_PATH)

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': DETECTED_DEVICE || 'Android Device',
  ...(DETECTED_DEVICE ? { 'appium:udid': DETECTED_DEVICE } : {}),
  'appium:appPackage': 'com.datareadyai.mobile',
  'appium:appActivity': '.MainActivity',
  'appium:noReset': true,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 120,
  'appium:autoGrantPermissions': true,
  'appium:appWaitActivity': 'com.datareadyai.mobile.*',
}

module.exports = {
  capabilities,
  ADB_PATH,
  DETECTED_DEVICE,
  resolveAdbPath,
  getConnectedDevice,
}
