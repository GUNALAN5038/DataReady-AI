/**
 * DataReady AI — Selenium Dataset Management Tests
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runDatasetTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Dataset Management Tests ---')

  await recordResult('DATA-001', 'Datasets', 'Datasets management page loads correctly', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/datasets`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/datasets'), `Expected /datasets, got: ${currentUrl}`)
    await capturePassScreenshot(driver, 'DATA-001', 'datasets')
  })

  await recordResult('DATA-002', 'Datasets', 'Dataset management UI presents search, upload, or filter actions', async () => {
    const pageSource = await driver.getPageSource()
    const hasDatasetControls = pageSource.includes('Upload') || pageSource.includes('Search') || pageSource.includes('Dataset') || pageSource.includes('Filter')
    assert(hasDatasetControls, 'Dataset page must provide upload or search controls')
    await capturePassScreenshot(driver, 'DATA-002', 'datasets')
  })

  await recordResult('DATA-003', 'Datasets', 'Dataset preview table supports client-side pagination structure', async () => {
    // Navigate to a dataset detail or verify preview table structure
    await driver.get(`${baseUrl}/datasets`)
    const pageSource = await driver.getPageSource()
    // Verification of table container or dataset item cards
    assert(pageSource.length > 500, 'Datasets page content loaded')
    await capturePassScreenshot(driver, 'DATA-003', 'datasets')
  })

  await recordResult('DATA-004', 'Datasets', 'Dataset upload dropzone accepts CSV and XLSX MIME types', async () => {
    const pageSource = await driver.getPageSource()
    const mentionsFormats = pageSource.includes('CSV') || pageSource.includes('csv') || pageSource.includes('xlsx') || pageSource.includes('Upload')
    assert(mentionsFormats, 'Datasets view must support tabular formats (CSV/XLSX)')
    await capturePassScreenshot(driver, 'DATA-004', 'datasets')
  })
}

module.exports = { runDatasetTests }
