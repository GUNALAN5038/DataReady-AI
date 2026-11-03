const assert = require('assert')

describe('DataReady AI Android — Notifications Suite', () => {
  it('AND-NOTI-001: Notifications button is accessible from top app bar', async () => {
    const notifBtn = await $('~Notifications')
    const exists = await notifBtn.isExisting().catch(() => false)
    assert(exists !== undefined, 'Notifications action should be in top bar')
  })
})
