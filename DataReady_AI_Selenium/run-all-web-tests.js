/**
 * DataReady AI — Selenium Master Test Suite Runner
 */

const path = require('path')
const fs = require('fs')
const { createWebDriver, getBaseUrl } = require('./config/selenium.config')
const { generateWebExcelReport } = require('./utils/excelReporter')
const { generateWebHtmlReport } = require('./utils/htmlReporter')

// Module suites
const { runAuthTests } = require('./tests/authentication/auth.test')
const { runDashboardTests } = require('./tests/dashboard/dashboard.test')
const { runDatasetTests } = require('./tests/datasets/datasets.test')
const { runAnalysisTests } = require('./tests/analysis/analysis.test')
const { runTransformationTests } = require('./tests/transformations/transformations.test')
const { runExportTests } = require('./tests/export/export.test')
const { runAIInsightsTests } = require('./tests/ai_insights/ai_insights.test')
const { runAIChatTests } = require('./tests/ai_chat/ai_chat.test')
const { runSettingsTests } = require('./tests/settings/settings.test')
const { runNotificationTests } = require('./tests/notifications/notifications.test')
const { runSecurityTests } = require('./tests/security/security.test')
const { runAccessibilityTests } = require('./tests/accessibility/accessibility.test')
const { runEndToEndLifecycle } = require('./tests/end_to_end/full_lifecycle.test')

const ROOT_DIR = path.resolve(__dirname, '../')
const SELENIUM_DIR = __dirname

async function runAllWebTests() {
  console.log('======================================================================')
  console.log(' DataReady AI — Complete Selenium Web E2E Test Suite Execution')
  console.log('======================================================================\n')

  const baseUrl = getBaseUrl()
  console.log(`[Web Runner] Target Base URL: ${baseUrl}`)

  const driver = await createWebDriver(true)
  const testResults = []
  const suiteStartTime = Date.now()

  async function recordResult(id, moduleName, description, fn) {
    const startTime = Date.now()
    try {
      await fn()
      const duration = Date.now() - startTime
      console.log(`  ✓ [${moduleName}] PASS: ${description} (${duration}ms)`)
      testResults.push({
        id,
        module: moduleName,
        description,
        status: 'PASS',
        duration,
        screenshot: `reports/final-testing/screenshots/web/${moduleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/web_${id}_PASS.png`,
      })
    } catch (err) {
      const duration = Date.now() - startTime
      console.error(`  ✗ [${moduleName}] FAIL: ${description} (${duration}ms)`)
      console.error(`    Error: ${err.message}`)
      testResults.push({
        id,
        module: moduleName,
        description,
        status: 'FAIL',
        duration,
        error: err.message,
      })
    }
  }

  try {
    // 1. Authentication
    await runAuthTests(driver, baseUrl, recordResult)

    // 2. Dashboard
    await runDashboardTests(driver, baseUrl, recordResult)

    // 3. Dataset Management
    await runDatasetTests(driver, baseUrl, recordResult)

    // 4. Data Analysis
    await runAnalysisTests(driver, baseUrl, recordResult)

    // 5. Data Transformations
    await runTransformationTests(driver, baseUrl, recordResult)

    // 6. Export
    await runExportTests(driver, baseUrl, recordResult)

    // 7. AI Insights
    await runAIInsightsTests(driver, baseUrl, recordResult)

    // 8. AI Chat
    await runAIChatTests(driver, baseUrl, recordResult)

    // 9. Settings
    await runSettingsTests(driver, baseUrl, recordResult)

    // 10. Notifications
    await runNotificationTests(driver, baseUrl, recordResult)

    // 11. Security
    await runSecurityTests(driver, baseUrl, recordResult)

    // 12. Accessibility
    await runAccessibilityTests(driver, baseUrl, recordResult)

    // 13. Full End-to-End Lifecycle
    await runEndToEndLifecycle(driver, baseUrl, recordResult)
  } finally {
    await driver.quit()
  }

  const totalDuration = Date.now() - suiteStartTime
  const passed = testResults.filter(t => t.status === 'PASS').length
  const failed = testResults.filter(t => t.status === 'FAIL').length
  const total = testResults.length

  console.log('\n======================================================================')
  console.log(` Execution Complete: ${total} Total, ${passed} Passed, ${failed} Failed (${(totalDuration / 1000).toFixed(2)}s)`)
  console.log('======================================================================\n')

  const summaryData = {
    total,
    passed,
    failed,
    skipped: 0,
    totalDuration,
    baseUrl,
  }

  // 1. Generate local Excel & HTML reports
  const localExcelPath = path.join(SELENIUM_DIR, 'reports/excel/DataReadyAI_Web_E2E_Report.xlsx')
  const localHtmlPath = path.join(SELENIUM_DIR, 'reports/html/index.html')
  await generateWebExcelReport(testResults, summaryData, localExcelPath)
  generateWebHtmlReport(testResults, summaryData, localHtmlPath)

  // 2. Copy/Generate to master final-testing report locations
  const masterExcelPath = path.join(ROOT_DIR, 'reports/final-testing/DataReadyAI_Web_E2E_Report.xlsx')
  const masterHtmlPath = path.join(ROOT_DIR, 'reports/final-testing/web-e2e.html')
  await generateWebExcelReport(testResults, summaryData, masterExcelPath)
  generateWebHtmlReport(testResults, summaryData, masterHtmlPath)

  return { total, passed, failed, totalDuration, testResults }
}

if (require.main === module) {
  runAllWebTests()
    .then(summary => {
      if (summary.failed > 0) process.exit(1)
      process.exit(0)
    })
    .catch(err => {
      console.error('[Web Runner Fatal Error]', err)
      process.exit(1)
    })
}

module.exports = { runAllWebTests }
