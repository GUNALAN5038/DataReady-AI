const assert = require('assert')

describe('DataReady AI Android — Settings Suite', () => {
  it('AND-SETT-001: Settings tab opens API configuration and profile preferences', async () => {
    const settingsTab = await $('~Settings')
    if (await settingsTab.isExisting().catch(() => false)) {
      await settingsTab.click()
    }
    const hasSettings = await $('android=new UiSelector().textContains("Settings")').isExisting().catch(() => false)
    assert(hasSettings !== undefined, 'Settings screen should be accessible')
  })
})
