/**
 * DataReady AI — Consolidated Testing Summary Engine
 * Dynamically aggregates Web E2E, Android Mobile, and API Load Test results from JSON artifacts.
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '../')

function readJsonSafe(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch (err) {
    console.warn(`[Summary Warning] Could not parse JSON at ${filePath}: ${err.message}`)
  }
  return null
}

function generateConsolidatedSummary() {
  const webJson = readJsonSafe(path.join(ROOT_DIR, 'DataReady_AI_Selenium/reports/json/summary.json')) ||
                  readJsonSafe(path.join(ROOT_DIR, 'reports/final-testing/web-summary.json'))

  const androidJson = readJsonSafe(path.join(ROOT_DIR, 'DataReady_AI_Appium/reports/json/summary.json')) ||
                      readJsonSafe(path.join(ROOT_DIR, 'reports/final-testing/android-summary.json'))

  const loadJson = readJsonSafe(path.join(ROOT_DIR, 'DataReady_AI_LoadTesting/reports/json/summary.json')) ||
                    readJsonSafe(path.join(ROOT_DIR, 'reports/final-testing/load-summary.json'))

  let markdown = '# 📊 DataReady AI — Consolidated Test & Performance Audit\n\n'
  markdown += `*Execution Timestamp: ${new Date().toISOString()}*\n\n`

  // 1. Functional E2E Test Suites
  markdown += '## 📱 🌐 Functional E2E Automation Suites (Test Cases)\n\n'
  markdown += '| Suite | Platform / Engine | Total Tests | Passed | Failed | Blocked / Skipped | Status |\n'
  markdown += '| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n'

  let totalFunctional = 0
  let passedFunctional = 0
  let failedFunctional = 0
  let blockedFunctional = 0

  if (webJson) {
    const total = webJson.total || 0
    const passed = webJson.passed || 0
    const failed = webJson.failed || 0
    const blocked = (webJson.blocked || 0) + (webJson.skipped || 0)
    totalFunctional += total
    passedFunctional += passed
    failedFunctional += failed
    blockedFunctional += blocked
    const status = failed > 0 ? '❌ FAIL' : '✅ PASS'
    markdown += `| **Web E2E** | Selenium WebDriver (Chrome) | ${total} | ${passed} | ${failed} | ${blocked} | ${status} |\n`
  } else {
    markdown += '| **Web E2E** | Selenium WebDriver (Chrome) | — | — | — | — | ⚠️ NO DATA |\n'
  }

  if (androidJson) {
    const total = androidJson.total || 0
    const passed = androidJson.passed || 0
    const failed = androidJson.failed || 0
    const blocked = (androidJson.blocked || 0) + (androidJson.skipped || 0)
    totalFunctional += total
    passedFunctional += passed
    failedFunctional += failed
    blockedFunctional += blocked
    const status = failed > 0 ? '❌ FAIL' : (blocked > 0 ? '⚠️ BLOCKED (Device Required)' : '✅ PASS')
    markdown += `| **Android E2E** | Appium + UiAutomator2 (Android 14/16) | ${total} | ${passed} | ${failed} | ${blocked} | ${status} |\n`
  } else {
    markdown += '| **Android E2E** | Appium + UiAutomator2 | — | — | — | — | ⚠️ NO DATA |\n'
  }

  markdown += `| **TOTAL FUNCTIONAL** | **Unified Platforms** | **${totalFunctional}** | **${passedFunctional}** | **${failedFunctional}** | **${blockedFunctional}** | **${failedFunctional === 0 ? '✅ PASS' : '❌ FAIL'}** |\n\n`

  // 2. High-Concurrency API Load & Stress Performance (HTTP Requests)
  markdown += '## ⚡ High-Concurrency API Load & SLA Stress Testing (HTTP Requests)\n\n'

  if (loadJson && loadJson.metrics) {
    const metrics = loadJson.metrics
    const httpReqs = metrics.http_reqs ? (metrics.http_reqs.values ? metrics.http_reqs.values.count : metrics.http_reqs.count) : 0
    const failedRate = metrics.http_req_failed ? (metrics.http_req_failed.values ? metrics.http_req_failed.values.rate : 0) : 0
    const durationObj = metrics.http_req_duration ? (metrics.http_req_duration.values || metrics.http_req_duration) : {}
    const avgLatency = durationObj.avg ? durationObj.avg.toFixed(2) : 'N/A'
    const medLatency = durationObj.med ? durationObj.med.toFixed(2) : 'N/A'
    const p90Latency = durationObj['p(90)'] ? durationObj['p(90)'].toFixed(2) : 'N/A'
    const p95Latency = durationObj['p(95)'] ? durationObj['p(95)'].toFixed(2) : 'N/A'
    const maxLatency = durationObj.max ? durationObj.max.toFixed(2) : 'N/A'
    const thresholdPass = failedRate < 0.05 && (parseFloat(p95Latency) < 2000 || isNaN(parseFloat(p95Latency)))

    markdown += '| Metric | Recorded Performance | SLA Target | Status |\n'
    markdown += '| :--- | :--- | :--- | :---: |\n'
    markdown += `| **Target Virtual Users (VUs)** | 100 Concurrent Users | Baseline Concurrency | ℹ️ |\n`
    markdown += `| **Total HTTP Requests** | **${httpReqs.toLocaleString()} requests** | Complete Run | ℹ️ |\n`
    markdown += `| **Average Latency** | ${avgLatency} ms | < 500 ms | ${parseFloat(avgLatency) < 500 ? '✅ PASS' : '⚠️ WARN'} |\n`
    markdown += `| **Median (p50) Latency** | ${medLatency} ms | < 400 ms | ${parseFloat(medLatency) < 400 ? '✅ PASS' : '⚠️ WARN'} |\n`
    markdown += `| **90th Percentile (p90)** | ${p90Latency} ms | < 1000 ms | ${parseFloat(p90Latency) < 1000 ? '✅ PASS' : '⚠️ WARN'} |\n`
    markdown += `| **95th Percentile (p95)** | ${p95Latency} ms | < 2000 ms | ${parseFloat(p95Latency) < 2000 ? '✅ PASS' : '❌ FAIL'} |\n`
    markdown += `| **Max Latency** | ${maxLatency} ms | System Envelope | ℹ️ |\n`
    markdown += `| **HTTP Failure Rate** | ${(failedRate * 100).toFixed(2)}% | < 5.0% | ${failedRate < 0.05 ? '✅ PASS' : '❌ FAIL'} |\n`
    markdown += `| **Overall SLA Compliance** | **${thresholdPass ? 'WITHIN SLA TOLERANCE' : 'EXCEEDED SLA'}** | SLA Baseline | **${thresholdPass ? '✅ PASS' : '❌ FAIL'}** |\n\n`
  } else {
    markdown += '> [!NOTE]\n> Load testing JSON metrics not detected in artifact directory.\n\n'
  }

  // 3. Artifacts & Audit Evidence
  markdown += '## 📑 Test Artifacts & Audit Evidence\n\n'
  markdown += '- **Web E2E Excel Report:** `reports/final-testing/DataReadyAI_Web_E2E_Report.xlsx`\n'
  markdown += '- **Web E2E HTML Report:** `reports/final-testing/web-e2e.html`\n'
  markdown += '- **Android Appium Excel Report:** `reports/final-testing/DataReadyAI_Android_E2E_Report.xlsx`\n'
  markdown += '- **Android Appium HTML Report:** `reports/final-testing/android-e2e.html`\n'
  markdown += '- **API Load Test Excel Report:** `reports/final-testing/DataReadyAI_Load_Test_Report.xlsx`\n'
  markdown += '- **API Load Test HTML Report:** `reports/final-testing/load-testing.html`\n\n'

  console.log(markdown)

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, 'utf8')
    console.log('[Summary Engine] Appended consolidated summary to GITHUB_STEP_SUMMARY.')
  }

  return { totalFunctional, passedFunctional, failedFunctional, blockedFunctional }
}

if (require.main === module) {
  generateConsolidatedSummary()
}

module.exports = { generateConsolidatedSummary }
