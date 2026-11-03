/**
 * DataReady AI — Android Appium Desired Capabilities
 */

const path = require('path')

const ADB_PATH = 'C:\\platform-tools\\platform-tools\\adb.exe'

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': '00092349L001564',
  'appium:udid': '00092349L001564',
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
}
