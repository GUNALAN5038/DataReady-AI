/**
 * DataReady AI — Selenium AI Insights Tests
 */

const assert = require('assert')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runAIInsightsTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running AI Insights Tests ---')

  await recordResult('AIIN-001', 'AI Insights', 'AI Insights endpoint handles dataset context without unexpected errors', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/dashboard`)

    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/insights`)
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 (dataset not found) or 200, got: ${res.status}`)
    assert(!JSON.stringify(res.data).includes('unexpected error'), 'Must not produce unexpected error')
    await capturePassScreenshot(driver, 'AIIN-001', 'ai-insights')
  })

  await recordResult('AIIN-002', 'AI Insights', 'AI Insights ensures server-side key hydration and never leaks secrets in body', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/insights`)
        .then(r => r.text().then(text => done({ text })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    const rawResponse = res.text || ''
    assert(!rawResponse.includes('AIzaSy'), 'AI insights must never leak Google API key prefix')
    assert(!rawResponse.includes('service_role'), 'AI insights must never leak service role keys')
    await capturePassScreenshot(driver, 'AIIN-002', 'ai-insights')
  })

  await recordResult('AIIN-003', 'AI Insights', 'AI Insights requires authentication and rejects unauthenticated callers with 401', async () => {
    // Clear cookies temporarily to test unauthenticated rejection
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      document.cookie = 'dataready-e2e-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/insights`)
        .then(r => done({ status: r.status }))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 401, `Expected 401 Unauthorized for unauthenticated call, got: ${res.status}`)

    // Immediately restore authorized session
    await setAuthenticatedSession(driver, baseUrl)
    await capturePassScreenshot(driver, 'AIIN-003', 'ai-insights')
  })
}

module.exports = { runAIInsightsTests }
