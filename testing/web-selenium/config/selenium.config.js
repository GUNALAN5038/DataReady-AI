const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

function getBaseUrl() {
  return process.env.TEST_BASE_URL || 'http://localhost:3000';
}

async function createWebDriver() {
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-extensions');
  options.addArguments('--ignore-certificate-errors');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({
    implicit: 3000,
    pageLoad: 15000,
    script: 10000
  });

  return driver;
}

module.exports = {
  getBaseUrl,
  createWebDriver
};
