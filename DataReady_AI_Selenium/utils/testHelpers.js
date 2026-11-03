/**
 * DataReady AI — Selenium Test Helpers
 */

const fs = require('fs')
const path = require('path')
const { By, until } = require('selenium-webdriver')

const SELENIUM_DIR = path.resolve(__dirname, '../')
const ROOT_DIR = path.resolve(__dirname, '../../')

/**
 * Sets the authorized E2E test session cookie into the browser context.
 */
async function setAuthenticatedSession(driver, baseUrl, token = 'dr_authorized_test_session_token_2026') {
  await driver.get(`${baseUrl}/login`)
  await driver.manage().addCookie({
    name: 'dataready-e2e-session',
    value: token,
    path: '/',
    domain: new URL(baseUrl).hostname,
    secure: false,
    httpOnly: false,
  })
}

/**
 * Clears all cookies from the browser context to simulate logout.
 */
async function clearSession(driver) {
  await driver.manage().deleteAllCookies()
}

/**
 * Captures screenshot ONLY upon test PASS.
 * Saves to both DataReady_AI_Selenium/reports/screenshots and reports/final-testing/screenshots/web
 */
async function capturePassScreenshot(driver, testId, category) {
  try {
    const filename = `web_${testId}_PASS.png`
    const localDir = path.join(SELENIUM_DIR, 'reports/screenshots', category)
    const masterDir = path.join(ROOT_DIR, 'reports/final-testing/screenshots/web', category)

    fs.mkdirSync(localDir, { recursive: true })
    fs.mkdirSync(masterDir, { recursive: true })

    const localPath = path.join(localDir, filename)
    const masterPath = path.join(masterDir, filename)

    const base64Data = await driver.takeScreenshot()
    fs.writeFileSync(localPath, base64Data, 'base64')
    fs.writeFileSync(masterPath, base64Data, 'base64')

    return `reports/final-testing/screenshots/web/${category}/${filename}`
  } catch (err) {
    console.warn(`[Screenshot Warning] Could not capture screenshot: ${err.message}`)
    return null
  }
}

/**
 * Waits for element with given locator and returns it.
 */
async function waitForElement(driver, locator, timeout = 10000) {
  await driver.wait(until.elementLocated(locator), timeout)
  const element = await driver.findElement(locator)
  await driver.wait(until.elementIsVisible(element), timeout)
  return element
}

/**
 * Checks for console errors.
 */
async function getBrowserConsoleErrors(driver) {
  try {
    const logs = await driver.manage().logs().get('browser')
    return logs.filter(log => log.level.name_ === 'SEVERE').map(log => log.message)
  } catch {
    return []
  }
}

module.exports = {
  setAuthenticatedSession,
  clearSession,
  capturePassScreenshot,
  waitForElement,
  getBrowserConsoleErrors,
}
