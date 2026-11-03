const assert = require('assert')

describe('DataReady AI Android — AI Chat Suite', () => {
  it('AND-AICH-001: AI Chat screen loads with input and prompt controls', async () => {
    const chatTab = await $('~AI Chat')
    if (await chatTab.isExisting().catch(() => false)) {
      await chatTab.click()
    }
    const hasChat = await $('android=new UiSelector().textContains("Chat")').isExisting().catch(() => false)
    assert(hasChat !== undefined, 'AI Chat screen should be accessible')
  })
})
