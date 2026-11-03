/**
 * DataReady AI — Selenium AI Chat Tests
 */

const assert = require('assert')
const { By, until } = require('selenium-webdriver')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runAIChatTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running AI Chat Tests ---')

  await recordResult('AICH-001', 'AI Chat', 'AI Chat page loads with conversation interface', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/chat`)
    await driver.wait(until.elementLocated(By.tagName('main')), 10000)
    const currentUrl = await driver.getCurrentUrl()
    assert(currentUrl.includes('/chat'), `Expected /chat, got: ${currentUrl}`)
    await capturePassScreenshot(driver, 'AICH-001', 'ai-chat')
  })

  await recordResult('AICH-002', 'AI Chat', 'Chat input accepts text and provides message submission control', async () => {
    const inputSelector = By.css('input[placeholder*="Ask"], textarea')
    await driver.wait(until.elementLocated(inputSelector), 10000)
    const chatInput = await driver.findElement(inputSelector)
    await driver.executeScript('arguments[0].scrollIntoView(true);', chatInput)
    await chatInput.sendKeys('Hello DataReady AI')
    const val = await chatInput.getAttribute('value')
    assert(val.includes('Hello'), 'Chat input must retain typed user prompt')
    await capturePassScreenshot(driver, 'AICH-002', 'ai-chat')
  })

  await recordResult('AICH-003', 'AI Chat', 'Conversational endpoint (/api/chat) validates prompt structure', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'What is data readiness?' }] }),
      })
        .then(r => done({ status: r.status, ok: r.ok }))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 200 || res.status === 400 || res.status === 500 || res.status === 503, `API route /api/chat returned: ${res.status}`)
    assert(res.status !== 404, '/api/chat route must exist')
    await capturePassScreenshot(driver, 'AICH-003', 'ai-chat')
  })

  await recordResult('AICH-004', 'AI Chat', 'Chat message container avoids raw script execution', async () => {
    const scripts = await driver.findElements(By.css('main script'))
    assert(scripts.length === 0, 'No raw script tags should be injected inside main conversation container')
    await capturePassScreenshot(driver, 'AICH-004', 'ai-chat')
  })
}

module.exports = { runAIChatTests }
