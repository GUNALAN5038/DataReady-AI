/**
 * DataReady AI — Selenium Full Lifecycle End-to-End Test
 */

const assert = require('assert')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runEndToEndLifecycle(driver, baseUrl, recordResult) {
  console.log('\n--- Running Complete End-to-End Lifecycle Tests ---')

  await recordResult('E2E-001', 'End-to-End', 'Full Platform Journey: Auth -> Dashboard -> Datasets -> Chat -> Settings', async () => {
    // 1. Establish authorized test session
    await setAuthenticatedSession(driver, baseUrl)

    // 2. Load Dashboard
    await driver.get(`${baseUrl}/dashboard`)
    let url = await driver.getCurrentUrl()
    assert(url.includes('/dashboard'), 'Step 1: Dashboard loaded')

    // 3. Navigate to Datasets
    await driver.get(`${baseUrl}/datasets`)
    url = await driver.getCurrentUrl()
    assert(url.includes('/datasets'), 'Step 2: Datasets loaded')

    // 4. Navigate to Chat
    await driver.get(`${baseUrl}/chat`)
    url = await driver.getCurrentUrl()
    assert(url.includes('/chat'), 'Step 3: Chat loaded')

    // 5. Navigate to Settings
    await driver.get(`${baseUrl}/settings`)
    url = await driver.getCurrentUrl()
    assert(url.includes('/settings'), 'Step 4: Settings loaded')

    await capturePassScreenshot(driver, 'E2E-001', 'dashboard')
  })
}

module.exports = { runEndToEndLifecycle }
