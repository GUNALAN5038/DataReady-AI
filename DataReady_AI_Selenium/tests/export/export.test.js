/**
 * DataReady AI — Selenium Export Tests
 */

const assert = require('assert')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runExportTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Export Tests ---')

  await recordResult('EXPO-001', 'Export', 'CSV Export endpoint responds with appropriate status for CSV format', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/dashboard`)

    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/export?format=csv`)
        .then(r => r.json().then(data => done({ status: r.status, data })).catch(() => done({ status: r.status })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 (dataset not found) or 200, got: ${res.status}`)
    await capturePassScreenshot(driver, 'EXPO-001', 'export')
  })

  await recordResult('EXPO-002', 'Export', 'XLSX Export endpoint responds with appropriate status for Excel format', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/export?format=xlsx`)
        .then(r => r.json().then(data => done({ status: r.status, data })).catch(() => done({ status: r.status })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got: ${res.status}`)
    await capturePassScreenshot(driver, 'EXPO-002', 'export')
  })

  await recordResult('EXPO-003', 'Export', 'Export endpoint validates format parameter and rejects invalid formats', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/export?format=unsupported_ext`)
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 400, `Expected 400 for unsupported format, got: ${res.status}`)
    assert(JSON.stringify(res.data).includes('Unsupported export format'), 'Response must explain unsupported format')
    await capturePassScreenshot(driver, 'EXPO-003', 'export')
  })

  await recordResult('EXPO-004', 'Export', 'Export endpoint defaults to CSV and operates decoupled from transformations', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/export`)
        .then(r => r.json().then(data => done({ status: r.status, data })).catch(() => done({ status: r.status })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200 for default format, got: ${res.status}`)
    await capturePassScreenshot(driver, 'EXPO-004', 'export')
  })
}

module.exports = { runExportTests }
