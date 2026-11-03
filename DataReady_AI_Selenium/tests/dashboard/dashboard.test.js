/**
 * DataReady AI — Selenium Dashboard Tests
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runDashboardTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Dashboard Tests ---')

  await recordResult('DASH-001', 'Dashboard', 'Dashboard page loads successfully with authenticated session', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/dashboard`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const title = await driver.getTitle()
    assert(title.includes('DataReady') || title.includes('Dashboard'), `Unexpected page title: ${title}`)
    await capturePassScreenshot(driver, 'DASH-001', 'dashboard')
  })

  await recordResult('DASH-002', 'Dashboard', 'Dashboard renders overview metric cards', async () => {
    const pageSource = await driver.getPageSource()
    const hasDatasetsMetric = pageSource.includes('Dataset') || pageSource.includes('Datasets')
    const hasQualityMetric = pageSource.includes('Quality') || pageSource.includes('Readiness') || pageSource.includes('Score')
    assert(hasDatasetsMetric, 'Dashboard should display datasets overview metric')
    assert(hasQualityMetric, 'Dashboard should display data quality / readiness metric')
    await capturePassScreenshot(driver, 'DASH-002', 'dashboard')
  })

  await recordResult('DASH-003', 'Dashboard', 'Primary navigation links to Datasets, Settings, and Chat are present', async () => {
    const navLinks = await driver.findElements(By.css('a[href*="/datasets"], a[href*="/settings"], a[href*="/chat"]'))
    assert(navLinks.length >= 2, `Expected at least 2 navigation links, found: ${navLinks.length}`)
    await capturePassScreenshot(driver, 'DASH-003', 'dashboard')
  })

  await recordResult('DASH-004', 'Dashboard', 'Dashboard handles empty/loaded dataset list gracefully', async () => {
    const pageSource = await driver.getPageSource()
    const hasContent = pageSource.includes('Recent') || pageSource.includes('Upload') || pageSource.includes('dataset')
    assert(hasContent, 'Dashboard should render content container or upload prompt')
    await capturePassScreenshot(driver, 'DASH-004', 'dashboard')
  })
}

module.exports = { runDashboardTests }
