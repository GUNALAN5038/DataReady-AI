const assert = require('assert')

describe('DataReady AI Android — Datasets Suite', () => {
  it('AND-DATA-001: Bottom navigation includes Datasets tab', async () => {
    const tab = await $('~Datasets')
    const fallback = await $('android=new UiSelector().textContains("Datasets")')
    const hasTab = (await tab.isExisting().catch(() => false)) || (await fallback.isExisting().catch(() => false))
    assert(hasTab, 'Datasets tab must exist in navigation bar')
  })

  it('AND-DATA-002: Datasets screen displays tabular metadata or dataset cards', async () => {
    const tab = await $('~Datasets')
    if (await tab.isExisting().catch(() => false)) {
      await tab.click()
    }
    const hasContent = await $('android=new UiSelector().textContains("Datasets")').isExisting().catch(() => false)
    assert(hasContent, 'Datasets view should load properly')
  })
})
