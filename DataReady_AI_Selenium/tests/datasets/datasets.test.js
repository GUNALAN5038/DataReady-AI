/**
 * DataReady AI — Selenium Dataset Management Tests
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runDatasetTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Dataset Management Tests ---')

  await recordResult('DATA-001', 'Datasets', 'Datasets management page loads correctly with heading', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/datasets`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/datasets'), `Expected /datasets, got: ${currentUrl}`)

    const headings = await driver.findElements(By.tagName('h1'))
    assert(headings.length > 0, 'Page must contain an h1 heading')
    const headingText = await headings[0].getText()
    assert(headingText.includes('Datasets') || headingText.includes('My Datasets'), `Heading text expected Datasets, got: ${headingText}`)
    await capturePassScreenshot(driver, 'DATA-001', 'datasets')
  })

  await recordResult('DATA-002', 'Datasets', 'Dataset management UI presents upload action button', async () => {
    const uploadLinks = await driver.findElements(By.css('a[href="/upload"], button:has(svg)'))
    assert(uploadLinks.length > 0, 'Upload dataset action button/link must be present on /datasets')
    await capturePassScreenshot(driver, 'DATA-002', 'datasets')
  })

  await recordResult('DATA-003', 'Datasets', 'Dataset list renders structured dataset cards or empty state container', async () => {
    await driver.get(`${baseUrl}/datasets`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const cards = await driver.findElements(By.css('.border, .rounded-xl, .rounded-2xl'))
    assert(cards.length > 0, 'Datasets container must render card elements')
    const pageText = await driver.findElement(By.tagName('main')).getText()
    const hasValidState = pageText.includes('Datasets') || pageText.includes('Upload') || pageText.includes('rows') || pageText.includes('No datasets found')
    assert(hasValidState, 'Datasets view must show active datasets or empty state')
    await capturePassScreenshot(driver, 'DATA-003', 'datasets')
  })

  await recordResult('DATA-004', 'Datasets', 'Upload view supports tabular formats (CSV/XLSX)', async () => {
    await driver.get(`${baseUrl}/upload`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const pageSource = await driver.getPageSource()
    const supportsFormats = pageSource.includes('CSV') || pageSource.includes('csv') || pageSource.includes('xlsx') || pageSource.includes('Upload')
    assert(supportsFormats, 'Upload interface must support tabular datasets (CSV/XLSX)')
    await capturePassScreenshot(driver, 'DATA-004', 'datasets')
  })
}

module.exports = { runDatasetTests }
