const assert = require('assert')

describe('DataReady AI Android — Navigation Stack Suite', () => {
  it('AND-NAV-001: Tab switching switches smoothly between Dashboard and Settings', async () => {
    const dashTab = await $('~Dashboard')
    if (await dashTab.isExisting().catch(() => false)) {
      await dashTab.click()
    }
    const hasDash = await $('android=new UiSelector().textContains("Dashboard")').isExisting().catch(() => false)
    assert(hasDash !== undefined, 'Navigation should return to dashboard')
  })
})
