const { By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');

class BasePage {
  constructor(driver, baseUrl = 'http://localhost:3000') {
    this.driver = driver;
    this.baseUrl = baseUrl;
    this.defaultTimeout = 10000;
  }

  async navigateTo(relativeUrl) {
    const fullUrl = `${this.baseUrl}${relativeUrl}`;
    await this.driver.get(fullUrl);
    await this.driver.wait(until.elementLocated(By.css('body')), this.defaultTimeout);
  }

  async getTitle() {
    return await this.driver.getTitle();
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async waitForElement(locator, timeout = this.defaultTimeout) {
    return await this.driver.wait(until.elementLocated(locator), timeout);
  }

  async waitForVisible(locator, timeout = this.defaultTimeout) {
    const element = await this.waitForElement(locator, timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async isElementPresent(locator) {
    try {
      const elements = await this.driver.findElements(locator);
      return elements.length > 0;
    } catch {
      return false;
    }
  }

  async click(locator, timeout = this.defaultTimeout) {
    const element = await this.waitForVisible(locator, timeout);
    await element.click();
  }

  async type(locator, text, timeout = this.defaultTimeout) {
    const element = await this.waitForVisible(locator, timeout);
    await element.clear();
    await element.sendKeys(text);
  }

  async getText(locator, timeout = this.defaultTimeout) {
    const element = await this.waitForVisible(locator, timeout);
    return await element.getText();
  }

  async takeScreenshot(testName, outputDir) {
    try {
      const imgData = await this.driver.takeScreenshot();
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const safeName = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeName}_${Date.now()}.png`;
      const fullPath = path.join(outputDir, filename);
      fs.writeFileSync(fullPath, imgData, 'base64');
      return fullPath;
    } catch (err) {
      console.warn(`[BasePage] Failed to capture screenshot: ${err.message}`);
      return null;
    }
  }
}

module.exports = { BasePage };
