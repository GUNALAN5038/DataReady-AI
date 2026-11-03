/**
 * DataReady AI — k6 Load Test Runner
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const { generateLoadTestReports } = require('./generateExcelReport')

const LOAD_DIR = path.resolve(__dirname, '../')
const ROOT_DIR = path.resolve(__dirname, '../../')

async function runK6LoadTest() {
  console.log('======================================================================')
  console.log(' DataReady AI — k6 API Baseline & Load Testing Execution')
  console.log('======================================================================\n')

  const summaryJsonPath = path.join(LOAD_DIR, 'reports/json/summary.json')
  fs.mkdirSync(path.dirname(summaryJsonPath), { recursive: true })

  const scriptPath = path.join(LOAD_DIR, 'scripts/load-test.js')
  const vus = process.env.K6_VUS || '100'
  const duration = process.env.K6_DURATION || '1m'
  console.log(`[k6 Runner] Executing ${vus} Virtual Users test (${duration})...`)

  let k6ProcessError = null

  try {
    const k6Cmd = `k6 run --summary-export="${summaryJsonPath}" "${scriptPath}"`
    console.log(`[k6 Runner] Command: ${k6Cmd}`)
    execSync(k6Cmd, {
      cwd: LOAD_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        K6_VUS: vus,
        K6_DURATION: duration,
        BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
        E2E_TEST_SESSION_TOKEN: process.env.E2E_TEST_SESSION_TOKEN || '',
      },
    })
  } catch (err) {
    k6ProcessError = err
    console.warn(`[k6 Runner Notification] k6 process returned non-zero exit: ${err.message}`)
  }

  if (fs.existsSync(summaryJsonPath)) {
    console.log('\n[k6 Runner] Raw JSON summary captured. Generating Excel and HTML reports...')
    await generateLoadTestReports(summaryJsonPath)

    const masterJsonPath = path.join(ROOT_DIR, 'reports/final-testing/load-summary.json')
    fs.mkdirSync(path.dirname(masterJsonPath), { recursive: true })
    fs.copyFileSync(summaryJsonPath, masterJsonPath)
    console.log(`[k6 Runner] Master JSON summary saved to: ${masterJsonPath}`)
  } else {
    throw new Error(`k6 summary not found at: ${summaryJsonPath}`)
  }

  if (k6ProcessError) {
    throw new Error(`k6 load testing failed SLA thresholds: ${k6ProcessError.message}`)
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
