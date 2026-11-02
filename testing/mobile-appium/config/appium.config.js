const path = require('path');

const APPIUM_HOST = process.env.APPIUM_HOST || '127.0.0.1';
const APPIUM_PORT = parseInt(process.env.APPIUM_PORT || '4723', 10);

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
  'appium:appPackage': 'com.datareadyai.mobile',
  'appium:appActivity': '.MainActivity',
  'appium:noReset': false,
  'appium:fullReset': false,
  'appium:newCommandTimeout': 60,
  'appium:autoGrantPermissions': true,
  'appium:appWaitActivity': 'com.datareadyai.mobile.*'
};

module.exports = {
  APPIUM_HOST,
  APPIUM_PORT,
  capabilities
};
