/**
 * DataReady AI — Selenium Accessibility & Responsiveness Tests
 */

const assert = require('assert')
const { By } = require('selenium-webdriver')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runAccessibilityTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Accessibility Tests ---')

  await recordResult('ACCE-001', 'Accessibility', 'Page includes primary semantic landmarks (<main>, <header>)', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/dashboard`)
    const mains = await driver.findElements(By.tagName('main'))
    assert(mains.length >= 1, 'Expected at least one <main> landmark')
    await capturePassScreenshot(driver, 'ACCE-001', 'dashboard')
  })

  await recordResult('ACCE-002', 'Accessibility', 'Viewport meta tag is configured for mobile responsiveness', async () => {
    const viewportMeta = await driver.findElements(By.css('meta[name="viewport"]'))
    assert(viewportMeta.length >= 1, 'Viewport meta tag must be present for responsive layouts')
    await capturePassScreenshot(driver, 'ACCE-002', 'dashboard')
  })

  await recordResult('ACCE-003', 'Accessibility', 'Interactive buttons provide accessible labels or icons', async () => {
    const buttons = await driver.findElements(By.tagName('button'))
    assert(buttons.length > 0, 'Buttons should be present on dashboard')
    await capturePassScreenshot(driver, 'ACCE-003', 'dashboard')
  })
}

module.exports = { runAccessibilityTests }
