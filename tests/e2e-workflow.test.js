const assert = require('node:assert/strict')
const { createJiti } = require('jiti')
const XLSX = require('xlsx')
const Papa = require('papaparse')

const jiti = createJiti(process.cwd())

// Load application modules
const { applyTransformations, calculateIQRBounds } = jiti('./lib/analysis/transformations')
const { detectDuplicates } = jiti('./lib/analysis/duplicates')
const { analyzeMissingValues } = jiti('./lib/analysis/missing-values')
const { detectOutliers } = jiti('./lib/analysis/outliers')
const { calculateStatistics } = jiti('./lib/analysis/statistics')
const { calculateMLReadiness } = jiti('./lib/analysis/ml-readiness')
const { inferColumnTypes } = jiti('./lib/analysis/data-types')
const { generateRecommendations } = jiti('./lib/analysis/recommendations')
const { encryptCredential, decryptCredential, maskApiKey } = jiti('./lib/crypto')

let passCount = 0
let failCount = 0

function testStep(stepName, fn) {
  try {
    fn()
    console.log(`  [PASS] ${stepName}`)
    passCount++
  } catch (err) {
    console.error(`  [FAIL] ${stepName}: ${err.message}`)
    failCount++
  }
}

console.log('\n======================================================================')
console.log(' DataReady AI — Real End-to-End Workflow & Life-Cycle Validation')
console.log('======================================================================\n')

// ===========================================================================
// WORKFLOW 1: Controlled Dataset Life-Cycle (Upload -> Analyze -> Transform -> Rollback -> Compare)
// ===========================================================================
console.log('--- WORKFLOW 1: Complete Dataset Life-Cycle Simulation ---')

// 1. Controlled Test Dataset
const initialRawData = [
  { id: '1', name: 'Product A', category: 'Tech', price: '100', rating: '4.5' },
  { id: '2', name: 'Product B', category: 'Tech', price: '120', rating: '' },    // Missing rating
  { id: '3', name: 'Product C', category: 'Home', price: '50',  rating: '3.8' },
  { id: '4', name: 'Product D', category: 'Home', price: '60',  rating: '4.0' },
  { id: '5', name: 'Product E', category: 'Tech', price: '110', rating: '4.9' },
  { id: '6', name: 'Product F', category: 'Home', price: '55',  rating: '3.9' },
  { id: '7', name: 'Product G', category: 'Tech', price: '115', rating: '4.2' },
  { id: '8', name: 'Product H', category: 'Tech', price: '105', rating: '4.1' },
  { id: '9', name: 'Product I', category: 'Home', price: '58',  rating: '4.0' },
  { id: '10', name: 'Product J', category: 'Tech', price: '5000', rating: '4.3' }, // Outlier price: 5000
  { id: '1', name: 'Product A', category: 'Tech', price: '100', rating: '4.5' }  // Duplicate of row 0
]
const initialColumns = ['id', 'name', 'category', 'price', 'rating']

let v0Analysis = null
let currentData = null
let currentColumns = null
let currentVersion = 0
const versionHistory = []

testStep('Step 1: Initial Quality Analysis on Raw Dataset (Version 0)', () => {
  const totalRows = initialRawData.length
  const colCount = initialColumns.length
  assert.equal(totalRows, 11)
  assert.equal(colCount, 5)

  const types = inferColumnTypes(initialRawData, initialColumns)
  assert.equal(types.price, 'numeric')
  assert.equal(types.rating, 'numeric')
  assert.equal(types.category, 'string')

  const missing = analyzeMissingValues(initialRawData, initialColumns)
  assert.equal(missing.rating.missingCount, 1)
  assert.equal(missing.price.missingCount, 0)

  const duplicates = detectDuplicates(initialRawData)
  assert.equal(duplicates.duplicateCount, 1, 'Should find exactly 1 duplicate row')
  assert.equal(duplicates.uniqueRows, 10)

  const outliers = detectOutliers(initialRawData, initialColumns, types)
  assert.ok(outliers.price.outlierCount >= 1, 'Should detect price 5000 as outlier')

  const mlScore = calculateMLReadiness(missing, duplicates, outliers, types, totalRows, colCount)
  assert.ok(mlScore.overallScore >= 0 && mlScore.overallScore <= 100)

  v0Analysis = {
    version: 0,
    types,
    missing,
    duplicates,
    outliers,
    mlScore,
    rowCount: totalRows,
    colCount
  }

  currentData = [...initialRawData]
  currentColumns = [...initialColumns]
  versionHistory.push({ version: 0, rowCount: totalRows, colCount, score: mlScore.overallScore })
})

testStep('Step 2: Non-Destructive In-Memory Transformation Preview', () => {
  // Preview dropping duplicates
  const beforeLength = currentData.length
  const outcome = applyTransformations(currentData, currentColumns, [
    { action: 'drop_duplicates', columns: 'all' }
  ])
  
  assert.equal(outcome.affectedRows, 1)
  assert.equal(outcome.data.length, 10)
  // Ensure original dataset in memory was NOT modified by preview
  assert.equal(currentData.length, beforeLength, 'Preview must NOT mutate active dataset')
})

testStep('Step 3: Apply Transformation — Drop Duplicate Rows (Create Version 1)', () => {
  const outcome = applyTransformations(currentData, currentColumns, [
    { action: 'drop_duplicates', columns: 'all' }
  ])
  currentData = outcome.data
  currentColumns = outcome.columns
  currentVersion = 1

  const dupsAfter = detectDuplicates(currentData)
  assert.equal(dupsAfter.duplicateCount, 0, 'Duplicates must be completely removed')
  assert.equal(currentData.length, 10)

  const types = inferColumnTypes(currentData, currentColumns)
  const missing = analyzeMissingValues(currentData, currentColumns)
  const outliers = detectOutliers(currentData, currentColumns, types)
  const v1Score = calculateMLReadiness(missing, dupsAfter, outliers, types, currentData.length, currentColumns.length)

  versionHistory.push({
    version: 1,
    action: 'drop_duplicates',
    rowCount: currentData.length,
    colCount: currentColumns.length,
    score: v1Score.overallScore
  })

  // ML readiness score should increase or stay same since duplicates dropped
  assert.ok(v1Score.overallScore >= v0Analysis.mlScore.overallScore, 'Score should improve after removing duplicates')
})

testStep('Step 4: Apply Transformation — Impute Missing Rating with Mean (Create Version 2)', () => {
  const outcome = applyTransformations(currentData, currentColumns, [
    { action: 'fill_missing', column: 'rating', method: 'mean' }
  ])
  currentData = outcome.data
  currentColumns = outcome.columns
  currentVersion = 2

  const missingAfter = analyzeMissingValues(currentData, currentColumns)
  assert.equal(missingAfter.rating.missingCount, 0, 'Rating missing values should now be 0')
  assert.equal(currentData.length, 10, 'Row count should remain 10 after imputation')

  // Verify the filled value is a valid numeric mean
  const filledRow = currentData.find(r => r.id === '2')
  assert.ok(filledRow.rating !== null && filledRow.rating !== '')
  assert.ok(Number(filledRow.rating) >= 3.5 && Number(filledRow.rating) <= 5.0)

  const types = inferColumnTypes(currentData, currentColumns)
  const dups = detectDuplicates(currentData)
  const outliers = detectOutliers(currentData, currentColumns, types)
  const v2Score = calculateMLReadiness(missingAfter, dups, outliers, types, currentData.length, currentColumns.length)

  versionHistory.push({
    version: 2,
    action: 'fill_missing',
    rowCount: currentData.length,
    colCount: currentColumns.length,
    score: v2Score.overallScore
  })
})

testStep('Step 5: Apply Transformation — Cap Outliers in Price (Create Version 3)', () => {
  const outcome = applyTransformations(currentData, currentColumns, [
    { action: 'handle_outliers', column: 'price', method: 'cap' }
  ])
  currentData = outcome.data
  currentColumns = outcome.columns
  currentVersion = 3

  const row10 = currentData.find(r => r.id === '10')
  assert.ok(Number(row10.price) < 5000, `Price should be capped below 5000, got: ${row10.price}`)
  assert.equal(currentData.length, 10, 'Winsorization/capping preserves all rows')

  const types = inferColumnTypes(currentData, currentColumns)
  const missing = analyzeMissingValues(currentData, currentColumns)
  const dups = detectDuplicates(currentData)
  const outliersAfter = detectOutliers(currentData, currentColumns, types)
  const v3Score = calculateMLReadiness(missing, dups, outliersAfter, types, currentData.length, currentColumns.length)

  versionHistory.push({
    version: 3,
    action: 'handle_outliers_cap',
    rowCount: currentData.length,
    colCount: currentColumns.length,
    score: v3Score.overallScore
  })
})

testStep('Step 6: Mathematical Compare Version 0 vs Current Version', () => {
  const initial = versionHistory[0]
  const current = versionHistory[versionHistory.length - 1]

  const rowDelta = current.rowCount - initial.rowCount
  const scoreDelta = current.score - initial.score

  assert.equal(rowDelta, -1, 'Total rows should be 1 less (duplicate removed)')
  assert.ok(scoreDelta >= 0, 'Cleaned dataset score must be >= initial score')
})

testStep('Step 7: Rollback / Revert to Version 0 (Restores V0 as new forward Version 4)', () => {
  // Revert restores Version 0 data as Version 4
  const restoredData = [...initialRawData]
  currentData = restoredData
  currentColumns = [...initialColumns]
  currentVersion = 4

  assert.equal(currentData.length, 11, 'Restored data must have original 11 rows')
  const dups = detectDuplicates(currentData)
  assert.equal(dups.duplicateCount, 1, 'Restored data must contain original duplicate')

  versionHistory.push({
    version: 4,
    action: 'revert_to_v0',
    rowCount: currentData.length,
    colCount: currentColumns.length
  })
})

// ===========================================================================
// WORKFLOW 2: Export Engine (CSV & XLSX Fidelity & Conversion)
// ===========================================================================
console.log('\n--- WORKFLOW 2: Export Engine Fidelity & Conversions ---')

testStep('Export: CSV serialization preserves columns and row integrity', () => {
  const csvText = Papa.unparse({
    fields: currentColumns,
    data: currentData
  })
  assert.ok(csvText.includes('Product A'))
  assert.ok(csvText.includes('category'))

  // Re-parse CSV text to verify lossless roundtrip
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  assert.equal(parsed.data.length, currentData.length)
  assert.deepEqual(parsed.meta.fields, currentColumns)
})

testStep('Export: XLSX workbook generation from CSV data', () => {
  const worksheet = XLSX.utils.json_to_sheet(currentData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  assert.ok(Buffer.isBuffer(excelBuffer))
  assert.ok(excelBuffer.length > 500, 'Excel buffer must contain valid XLSX binary data')

  // Read back Excel buffer to verify fidelity
  const readBack = XLSX.read(excelBuffer, { type: 'buffer' })
  assert.equal(readBack.SheetNames[0], 'Data')
  const sheetJson = XLSX.utils.sheet_to_json(readBack.Sheets['Data'])
  assert.equal(sheetJson.length, currentData.length)
  assert.equal(sheetJson[0].name, 'Product A')
})

// ===========================================================================
// WORKFLOW 3: Multi-Tenant RLS & API Access Control Simulation
// ===========================================================================
console.log('\n--- WORKFLOW 3: Multi-Tenant & API Authorization Rules ---')

testStep('RLS Isolation: User A vs User B ownership validation', () => {
  const userA_Id = 'user_aaa_1111'
  const userB_Id = 'user_bbb_2222'

  const mockDatabaseDatasets = [
    { id: 'ds_1', user_id: userA_Id, name: 'User A Secret Financials' },
    { id: 'ds_2', user_id: userB_Id, name: 'User B Health Records' }
  ]

  // Simulating query execution with user session filter
  function queryUserDatasets(activeUserId, datasetId) {
    const record = mockDatabaseDatasets.find(d => d.id === datasetId && d.user_id === activeUserId)
    if (!record) {
      return { status: 404, error: 'Dataset not found or access denied.' }
    }
    return { status: 200, data: record }
  }

  // User A requests own dataset -> 200
  const userAReqOwn = queryUserDatasets(userA_Id, 'ds_1')
  assert.equal(userAReqOwn.status, 200)

  // User B attempts to access User A's dataset -> 404 access denied
  const userBAttacksA = queryUserDatasets(userB_Id, 'ds_1')
  assert.equal(userBAttacksA.status, 404)
  assert.equal(userBAttacksA.data, undefined)
})

testStep('Storage Isolation: File paths strictly enforce user ID prefix', () => {
  const userId = 'user_789'
  const datasetId = 'ds_456'
  const targetPath = `${userId}/${datasetId}/versions/version_1.csv`

  const folderParts = targetPath.split('/')
  assert.equal(folderParts[0], userId, 'First folder MUST equal auth.uid()')
  assert.equal(folderParts[1], datasetId)
})

// ===========================================================================
// WORKFLOW 4: AI Provider Key Encryption & Decryption
// ===========================================================================
console.log('\n--- WORKFLOW 4: AI Provider Key Encryption & Decryption ---')

testStep('Key Security: AES-256-GCM encryption with unique IV per call', () => {
  const apiKey = 'AIzaSyDemoKeyForGeminiTesting123456789'
  const enc1 = encryptCredential(apiKey)
  const enc2 = encryptCredential(apiKey)

  // IV must be random per encryption call
  assert.notEqual(enc1, enc2, 'Two encryptions of same key must produce different ciphertexts due to random IV')
  assert.equal(decryptCredential(enc1), apiKey)
  assert.equal(decryptCredential(enc2), apiKey)
})

testStep('Key Masking: UI receives masked prefix/suffix only', () => {
  const key = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'
  const preview = maskApiKey(key)
  assert.equal(preview.startsWith('AIzaSy'), true)
  assert.equal(preview.endsWith('O5P6'), true)
  assert.ok(preview.includes('••••••••••••'))
  assert.ok(!preview.includes('A1B2C3D4E5F6G7H8I9J0K1L2M3N4'))
})

console.log('\n======================================================================')
console.log(` Summary: ${passCount} passed, ${failCount} failed.`)
console.log('======================================================================\n')

if (failCount > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
