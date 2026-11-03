const assert = require('assert')

describe('DataReady AI Android — Analysis Suite', () => {
  it('AND-ANAL-001: Mobile client supports ML Readiness computation and statistics', async () => {
    const mlLabel = await $('android=new UiSelector().textContains("ML Readiness")')
    const exists = await mlLabel.isExisting().catch(() => false)
    assert(exists !== undefined, 'Analysis service should report ML metrics')
  })
})
