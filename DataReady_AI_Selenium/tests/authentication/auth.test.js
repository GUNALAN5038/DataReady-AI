/**
 * DataReady AI — Selenium Authentication Tests
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, clearSession, capturePassScreenshot } = require('../../utils/testHelpers')
const { TEST_CREDENTIALS } = require('../../utils/testData')

async function runAuthTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Authentication Tests ---')

  // Test 1: Login Page Loads
  await recordResult('AUTH-001', 'Authentication', 'Login page loads with form inputs', async () => {
    await clearSession(driver)
    await driver.get(`${baseUrl}/login`)
    await driver.wait(until.elementLocated(By.css('input[type="email"], input[name="email"]')), 10000)
    const emailInput = await driver.findElement(By.css('input[type="email"], input[name="email"]'))
    const passInput = await driver.findElement(By.css('input[type="password"], input[name="password"]'))
    assert(emailInput, 'Email input should be present')
    assert(passInput, 'Password input should be present')
    await capturePassScreenshot(driver, 'AUTH-001', 'authentication')
  })

  // Test 2: Protected Route Redirect
  await recordResult('AUTH-002', 'Authentication', 'Protected route redirects unauthenticated user to /login', async () => {
    await clearSession(driver)
    await driver.get(`${baseUrl}/dashboard`)
    await driver.wait(until.urlContains('/login'), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/login'), `Expected redirect to /login, got: ${currentUrl}`)
    await capturePassScreenshot(driver, 'AUTH-002', 'authentication')
  })

  // Test 3: Invalid Login Validation
  await recordResult('AUTH-003', 'Authentication', 'Invalid credentials trigger error message or form validation', async () => {
    await driver.get(`${baseUrl}/login`)
    const emailInput = await driver.findElement(By.css('input[type="email"], input[name="email"]'))
    const passInput = await driver.findElement(By.css('input[type="password"], input[name="password"]'))
    await emailInput.clear()
    await emailInput.sendKeys(TEST_CREDENTIALS.invalid.email)
    await passInput.clear()
    await passInput.sendKeys(TEST_CREDENTIALS.invalid.password)

    const submitBtn = await driver.findElement(By.css('button[type="submit"]'))
    await submitBtn.click()

    // Wait for network response or validation notification
    await driver.sleep(1500)
    const pageSource = await driver.getPageSource()
    const errorDetected = pageSource.includes('Invalid') || pageSource.includes('error') || pageSource.includes('Failed') || pageSource.includes('alert')
    assert(errorDetected || (await driver.getCurrentUrl()).includes('/login'), 'Invalid credentials should prevent login')
    await capturePassScreenshot(driver, 'AUTH-003', 'authentication')
  })

  // Test 4: Authorized Session Persistence
  await recordResult('AUTH-004', 'Authentication', 'Authorized session cookie unlocks dashboard access', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/dashboard`)
    await driver.wait(until.urlContains('/dashboard'), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/dashboard'), `Expected /dashboard, got ${currentUrl}`)
    await capturePassScreenshot(driver, 'AUTH-004', 'authentication')
  })

  // Test 5: Logout Flow
  await recordResult('AUTH-005', 'Authentication', 'Clearing session revokes access and redirects to /login', async () => {
    await clearSession(driver)
    await driver.get(`${baseUrl}/dashboard`)
    await driver.wait(until.urlContains('/login'), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/login'), `Expected redirect to /login after logout, got: ${currentUrl}`)
    await capturePassScreenshot(driver, 'AUTH-005', 'authentication')
  })
}

module.exports = { runAuthTests }
