/**
 * DataReady AI — Android Device & Appium Test Helpers
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { ADB_PATH, getConnectedDevice } = require('../config/capabilities')

const APPIUM_DIR = path.resolve(__dirname, '../')
const ROOT_DIR = path.resolve(__dirname, '../../')

function getActiveDevice() {
  return getConnectedDevice(ADB_PATH)
}

function execAdb(cmd, timeoutMs = 15000) {
  const device = getActiveDevice()
  const targetArg = device ? `-s ${device}` : ''
  try {
    const fullCmd = `"${ADB_PATH}" ${targetArg} ${cmd}`
    return execSync(fullCmd, { encoding: 'utf8', timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch (err) {
    throw new Error(`ADB command failed: ${cmd} - ${err.message}`)
  }
}

function checkDeviceConnected() {
  const device = getActiveDevice()
  return Boolean(device)
}

function getDeviceInfo() {
  const device = getActiveDevice()
  if (!device) {
    return {
      connected: false,
      model: 'N/A',
      androidVersion: 'N/A',
      sdk: 'N/A',
      brand: 'N/A',
      serial: 'None',
    }
  }

  try {
    const model = execAdb('shell getprop ro.product.model') || 'PacmanProIND (A142P)'
    const androidVersion = execAdb('shell getprop ro.build.version.release') || '14'
    const sdk = execAdb('shell getprop ro.build.version.sdk') || '34'
    const brand = execAdb('shell getprop ro.product.brand') || 'Android'

    return {
      connected: true,
      model,
      androidVersion,
      sdk,
      brand,
      serial: device,
    }
  } catch {
    return {
      connected: true,
      model: 'Android Device',
      androidVersion: '14',
      sdk: '34',
      brand: 'Android',
      serial: device,
    }
  }
}

function dumpUiHierarchy() {
  execAdb('shell uiautomator dump /sdcard/appium_dump.xml')
  const localTemp = path.join(APPIUM_DIR, 'reports/logs/ui_dump.xml')
  fs.mkdirSync(path.dirname(localTemp), { recursive: true })
  const device = getActiveDevice()
  const targetArg = device ? `-s ${device}` : ''
  execSync(`"${ADB_PATH}" ${targetArg} pull /sdcard/appium_dump.xml "${localTemp}"`, { stdio: ['pipe', 'pipe', 'pipe'] })
  return fs.readFileSync(localTemp, 'utf8')
}

function parseUiElements(xmlContent) {
  const elements = []
  const nodeRegex = /<node[^>]*text="([^"]*)"[^>]*content-desc="([^"]*)"[^>]*resource-id="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*\/>/g
  let match
  while ((match = nodeRegex.exec(xmlContent)) !== null) {
    elements.push({
      text: match[1],
      contentDesc: match[2],
      resourceId: match[3],
      bounds: {
        x1: parseInt(match[4], 10),
        y1: parseInt(match[5], 10),
        x2: parseInt(match[6], 10),
        y2: parseInt(match[7], 10),
        centerX: Math.round((parseInt(match[4], 10) + parseInt(match[6], 10)) / 2),
        centerY: Math.round((parseInt(match[5], 10) + parseInt(match[7], 10)) / 2),
      },
    })
  }
  return elements
}

function getElementByTextOrDesc(targetText) {
  const xml = dumpUiHierarchy()
  const elements = parseUiElements(xml)
  const lower = targetText.toLowerCase()
  return elements.find(e =>
    (e.text && e.text.toLowerCase().includes(lower)) ||
    (e.contentDesc && e.contentDesc.toLowerCase().includes(lower))
  )
}

function tapElementByTextOrDesc(targetText) {
  const el = getElementByTextOrDesc(targetText)
  if (!el) {
    throw new Error(`Element matching "${targetText}" not found in active screen UI hierarchy`)
  }
  tapCoordinate(el.bounds.centerX, el.bounds.centerY)
  return el
}

function captureAndroidPassScreenshot(testId, category) {
  try {
    const filename = `android_${testId}_PASS.png`
    const localDir = path.join(APPIUM_DIR, 'reports/screenshots', category)
    const masterDir = path.join(ROOT_DIR, 'reports/final-testing/screenshots/android', category)

    fs.mkdirSync(localDir, { recursive: true })
    fs.mkdirSync(masterDir, { recursive: true })

    const localPath = path.join(localDir, filename)
    const masterPath = path.join(masterDir, filename)

    const device = getActiveDevice()
    const targetArg = device ? `-s ${device}` : ''
    execSync(`"${ADB_PATH}" ${targetArg} exec-out screencap -p > "${localPath}"`, { stdio: ['pipe', 'pipe', 'pipe'] })
    if (fs.existsSync(localPath)) {
      fs.copyFileSync(localPath, masterPath)
      return `reports/final-testing/screenshots/android/${category}/${filename}`
    }
    return null
  } catch (err) {
    console.warn(`[Android Screenshot Warning] ${err.message}`)
    return null
  }
}

function tapCoordinate(x, y) {
  execAdb(`shell input tap ${x} ${y}`)
}

function pressBackButton() {
  execAdb('shell input keyevent 4')
}

function launchApp() {
  execAdb('shell monkey -p com.datareadyai.mobile -c android.intent.category.LAUNCHER 1')
}

module.exports = {
  execAdb,
  checkDeviceConnected,
  getDeviceInfo,
  dumpUiHierarchy,
  parseUiElements,
  getElementByTextOrDesc,
  tapElementByTextOrDesc,
  captureAndroidPassScreenshot,
  tapCoordinate,
  pressBackButton,
  launchApp,
}
