/**
 * DataReady AI — Selenium Full Lifecycle End-to-End Test
 * Verifies complete user journey: Login -> Dashboard -> Datasets -> AI Chat -> Settings -> Logout.
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, clearSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runEndToEndLifecycle(driver, baseUrl, recordResult) {
  console.log('\n--- Running Complete End-to-End Lifecycle Tests ---')

  await recordResult('E2E-001', 'End-to-End', 'Full Platform Journey: Auth -> Dashboard -> Datasets -> Chat -> Settings -> Logout', async () => {
    // 1. Establish authorized test session (Login)
    await setAuthenticatedSession(driver, baseUrl)

    // 2. Load Dashboard & verify readiness
    await driver.get(`${baseUrl}/dashboard`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    let url = await driver.getCurrentUrl()
    assert(url.includes('/dashboard'), 'Step 1: Dashboard loaded')

    // 3. Navigate to Datasets & verify readiness
    await driver.get(`${baseUrl}/datasets`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    url = await driver.getCurrentUrl()
    assert(url.includes('/datasets'), 'Step 2: Datasets loaded')

    // 4. Navigate to Chat & verify readiness
    await driver.get(`${baseUrl}/chat`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    url = await driver.getCurrentUrl()
    assert(url.includes('/chat'), 'Step 3: Chat loaded')

    // 5. Navigate to Settings & verify readiness
    await driver.get(`${baseUrl}/settings`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    url = await driver.getCurrentUrl()
    assert(url.includes('/settings'), 'Step 4: Settings loaded')

    // 6. Complete Journey with Logout
    await clearSession(driver)
    await driver.get(`${baseUrl}/dashboard`)
    await driver.wait(until.urlContains('/login'), 10000)
    url = await driver.getCurrentUrl()
    assert(url.includes('/login'), 'Step 5: Logged out and redirected to /login')

    // Restore session for any subsequent reporting
    await setAuthenticatedSession(driver, baseUrl)
    await capturePassScreenshot(driver, 'E2E-001', 'dashboard')
  })
}

module.exports = { runEndToEndLifecycle }
