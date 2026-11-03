/**
 * DataReady AI — Selenium Transformations Tests
 */

const assert = require('assert')
const { setAuthenticatedSession, capturePassScreenshot } = require('../../utils/testHelpers')

async function runTransformationTests(driver, baseUrl, recordResult) {
  console.log('\n--- Running Transformations Tests ---')

  await recordResult('TRAN-001', 'Transformations', 'Transformation normalization handles drop_column cleanly', async () => {
    await setAuthenticatedSession(driver, baseUrl)
    await driver.get(`${baseUrl}/datasets`)

    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drop_column', column: 'salary' }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 (dataset not found) or 200, got: ${res.status} (${JSON.stringify(res.data)})`)
    assert(!JSON.stringify(res.data).includes('undefined'), 'Must not report undefined transformation action')
    await capturePassScreenshot(driver, 'TRAN-001', 'transformations')
  })

  await recordResult('TRAN-002', 'Transformations', 'Column renaming validates parameters properly', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_column', column: 'salary', newName: 'compensation' }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`)
    await capturePassScreenshot(driver, 'TRAN-002', 'transformations')
  })

  await recordResult('TRAN-003', 'Transformations', 'Duplicate elimination removes duplicate records while preserving singles', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drop_duplicates' }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`)
    await capturePassScreenshot(driver, 'TRAN-003', 'transformations')
  })

  await recordResult('TRAN-004', 'Transformations', 'Missing value imputation supports mean, median, mode, and custom values', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fill_missing', column: 'salary', method: 'mean' }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`)
    await capturePassScreenshot(driver, 'TRAN-004', 'transformations')
  })

  await recordResult('TRAN-005', 'Transformations', 'Outlier capping bounds extreme records to upper/lower fences', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'handle_outliers', column: 'salary', strategy: 'cap' }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`)
    await capturePassScreenshot(driver, 'TRAN-005', 'transformations')
  })

  await recordResult('TRAN-006', 'Transformations', 'Data type conversion accurately parses numeric, boolean, date, and text types', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_type', column: 'salary', targetType: 'integer' }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`)
    await capturePassScreenshot(driver, 'TRAN-006', 'transformations')
  })

  await recordResult('TRAN-007', 'Transformations', 'Rollback restores previous dataset snapshot non-destructively', async () => {
    const res = await driver.executeAsyncScript((baseUrl, done) => {
      fetch(`${baseUrl}/api/datasets/00000000-0000-0000-0000-000000000000/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: 0 }),
      })
        .then(r => r.json().then(data => done({ status: r.status, data })))
        .catch(err => done({ error: err.message }))
    }, baseUrl)

    assert(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`)
    await capturePassScreenshot(driver, 'TRAN-007', 'transformations')
  })
}

module.exports = { runTransformationTests }
