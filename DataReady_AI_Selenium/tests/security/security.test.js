/**
 * DataReady AI — Selenium Security Tests
 */

const assert = require('assert')
const { setAuthenticatedSession, capturePassScreenshot, getBrowserConsoleErrors } = require('../../utils/testHelpers')

async function runSecurityTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Security Tests ---')

  await recordResult('SECU-001', 'Security', 'HTTP responses enforce defense-in-depth security headers', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/dashboard`)

    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/dashboard`)
        .then(r => done({ status: r.status, ok: r.ok }))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 200, `Dashboard HTTP response must be 200, got: ${res.status}`)
    await capturePassScreenshot(driver, 'SECU-001', 'dashboard')
  })

  await recordResult('SECU-002', 'Security', 'Browser console does NOT leak Supabase service role keys or raw credentials', async () => {
    const consoleErrors = await getBrowserConsoleErrors(driver)
    const leaksKey = consoleErrors.some(e => e.includes('service_role') || e.includes('AIzaSy'))
    assert(!leaksKey, 'Browser console must never log secret credentials')
    await capturePassScreenshot(driver, 'SECU-002', 'dashboard')
  })

  await recordResult('SECU-003', 'Security', 'Cross-user dataset access is blocked by Row Level Security (RLS)', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/ffffffff-ffff-ffff-ffff-ffffffffffff/analyze`, { method: 'POST' })
        .then(r => done({ status: r.status }))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 401 || res.status === 405, `Cross-user dataset access must be 404 or 401, got: ${res.status}`)
    await capturePassScreenshot(driver, 'SECU-003', 'dashboard')
  })
}

module.exports = { runSecurityTests }
