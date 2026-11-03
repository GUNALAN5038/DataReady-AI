const assert = require('assert')

describe('DataReady AI Android — Authentication Suite', () => {
  it('AND-AUTH-001: Authenticated session persists and loads dashboard', async () => {
    const welcome = await $('android=new UiSelector().textContains("Welcome")')
    const dashboard = await $('android=new UiSelector().textContains("Dashboard")')
    const isWelcome = await welcome.isExisting().catch(() => false)
    const isDashboard = await dashboard.isExisting().catch(() => false)
    assert(isWelcome || isDashboard, 'App should load dashboard without requiring re-authentication')
  })
})
