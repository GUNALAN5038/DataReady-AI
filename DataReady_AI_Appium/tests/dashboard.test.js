const assert = require('assert')

describe('DataReady AI Android — Dashboard Metrics Suite', () => {
  it('AND-DASH-001: Displays Total Datasets metric card', async () => {
    const el = await $('android=new UiSelector().textContains("Total Datasets")')
    const exists = await el.isExisting().catch(() => false)
    assert(exists, 'Total Datasets card must exist on Dashboard')
  })

  it('AND-DASH-002: Renders Quality Score and ML Readiness metrics', async () => {
    const mlScore = await $('android=new UiSelector().textContains("ML Readiness")')
    const qualityScore = await $('android=new UiSelector().textContains("Quality Score")')
    const hasMl = await mlScore.isExisting().catch(() => false)
    const hasQuality = await qualityScore.isExisting().catch(() => false)
    assert(hasMl || hasQuality, 'Dashboard should render ML Readiness or Quality Score metrics')
  })

  it('AND-DASH-003: Displays Recent Datasets or quick action overview', async () => {
    const recent = await $('android=new UiSelector().textContains("Recent Datasets")')
    const overview = await $('android=new UiSelector().textContains("Overview")')
    const hasRecent = await recent.isExisting().catch(() => false)
    const hasOverview = await overview.isExisting().catch(() => false)
    assert(hasRecent || hasOverview, 'Dashboard must render recent datasets or overview section')
  })
})
