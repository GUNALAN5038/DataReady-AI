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
 * Prioritizes real Supabase authentication when TEST_USER_EMAIL and TEST_USER_PASSWORD
 * are provided; otherwise uses the configured E2E_TEST_SESSION_TOKEN.
 * Throws an explicit configuration error if neither is configured.
 */
async function setAuthenticatedSession(driver, baseUrl, explicitToken) {
  const activeToken = explicitToken || process.env.E2E_TEST_SESSION_TOKEN

  // 1. Real Supabase Authentication Flow via UI if credentials provided
  const testEmail = process.env.TEST_USER_EMAIL
  const testPassword = process.env.TEST_USER_PASSWORD

  if (testEmail && testPassword && !explicitToken) {
    try {
      await driver.get(`${baseUrl}/login`)
      await driver.wait(until.elementLocated(By.css('input[type="email"], input[name="email"]')), 10000)
      const emailInput = await driver.findElement(By.css('input[type="email"], input[name="email"]'))
      const passInput = await driver.findElement(By.css('input[type="password"], input[name="password"]'))
      await emailInput.clear()
      await emailInput.sendKeys(testEmail)
      await passInput.clear()
      await passInput.sendKeys(testPassword)

      const submitBtn = await driver.findElement(By.css('button[type="submit"]'))
      await submitBtn.click()

      await driver.wait(until.urlContains('/dashboard'), 10000)
      return
    } catch (err) {
      console.warn(`[Auth Helper Notification] Real UI login attempt failed: ${err.message}. Checking token configuration...`)
    }
  }

  // 2. Authorized CI Test Session Token
  if (activeToken && activeToken.trim().length > 0) {
    await driver.get(`${baseUrl}/login`)
    await driver.manage().addCookie({
      name: 'dataready-e2e-session',
      value: activeToken.trim(),
      path: '/',
      domain: new URL(baseUrl).hostname,
      secure: false,
      httpOnly: false,
    })
    return
  }

  // 3. Explicit Configuration Error when neither is configured
  throw new Error(
    '[Authentication Configuration Error] No valid test credentials or E2E_TEST_SESSION_TOKEN found in environment. ' +
    'Please set TEST_USER_EMAIL & TEST_USER_PASSWORD, or configure E2E_TEST_SESSION_TOKEN in environment / GitHub Secrets.'
  )
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
