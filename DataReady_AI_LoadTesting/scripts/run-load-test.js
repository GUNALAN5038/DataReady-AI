/**
 * DataReady AI — k6 Load Test Runner
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { generateLoadTestReports } = require('./generateExcelReport')

const LOAD_DIR = path.resolve(__dirname, '../')

async function runK6LoadTest() {
  console.log('======================================================================')
  console.log(' DataReady AI — k6 API Baseline & Load Testing Execution')
  console.log('======================================================================\n')

  const summaryJsonPath = path.join(LOAD_DIR, 'reports/json/summary.json')
  fs.mkdirSync(path.dirname(summaryJsonPath), { recursive: true })

  const scriptPath = path.join(LOAD_DIR, 'scripts/load-test.js')
  console.log(`[k6 Runner] Executing 100 Virtual Users test (1 minute)...`)

  try {
    // Execute k6 with summary export
    const k6Cmd = `k6 run --summary-export="${summaryJsonPath}" "${scriptPath}"`
    console.log(`[k6 Runner] Command: ${k6Cmd}`)
    execSync(k6Cmd, {
      cwd: LOAD_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        K6_VUS: '100',
        K6_DURATION: '1m',
        BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
        E2E_TEST_SESSION_TOKEN: process.env.E2E_TEST_SESSION_TOKEN || 'dr_authorized_test_session_token_2026',
      },
    })
  } catch (err) {
    console.warn(`[k6 Runner Notification] k6 process returned: ${err.message}`)
  }

  if (fs.existsSync(summaryJsonPath)) {
    console.log('\n[k6 Runner] Raw JSON summary captured. Generating Excel and HTML reports...')
    await generateLoadTestReports(summaryJsonPath)
  } else {
    throw new Error(`k6 summary not found at: ${summaryJsonPath}`)
  }
}

if (require.main === module) {
  runK6LoadTest()
    .then(() => {
      console.log('\n[k6 Runner] Load testing complete.')
      process.exit(0)
    })
    .catch(err => {
      console.error('[k6 Runner Fatal Error]', err)
      process.exit(1)
    })
}

module.exports = { runK6LoadTest }
