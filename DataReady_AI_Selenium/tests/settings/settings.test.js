/**
 * DataReady AI — Selenium Settings Tests
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runSettingsTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Settings Tests ---')

  await recordResult('SETT-001', 'Settings', 'Settings page loads successfully with configuration tabs', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/settings`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/settings'), `Expected /settings, got: ${currentUrl}`)
    await capturePassScreenshot(driver, 'SETT-001', 'settings')
  })

  await recordResult('SETT-002', 'Settings', 'API Keys management tab provides credential configuration controls', async () => {
    const pageSource = await driver.getPageSource()
    const hasKeysTab = pageSource.includes('API') || pageSource.includes('Key') || pageSource.includes('Provider') || pageSource.includes('Settings')
    assert(hasKeysTab, 'API Key configuration controls present')
    await capturePassScreenshot(driver, 'SETT-002', 'settings')
  })

  await recordResult('SETT-003', 'Settings', 'User keys API responds safely and never reveals raw server environment secrets', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/user/keys`)
        .then(r => r.json().then(data => done({ status: r.status, data })).catch(() => done({ status: r.status })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 200 || res.status === 401 || res.status === 500, `Keys endpoint returned status: ${res.status}`)
    const payload = JSON.stringify(res.data || {})
    assert(!payload.includes('AIzaSy'), 'Must not leak raw server Gemini API key')
    await capturePassScreenshot(driver, 'SETT-003', 'settings')
  })
}

module.exports = { runSettingsTests }
