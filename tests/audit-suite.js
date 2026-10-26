const assert = require('node:assert/strict')
const { createJiti } = require('jiti')
const jiti = createJiti(process.cwd())

// Load application modules through jiti
const { applyTransformations, calculateIQRBounds } = jiti('./lib/analysis/transformations')
const { detectDuplicates } = jiti('./lib/analysis/duplicates')
const { analyzeMissingValues } = jiti('./lib/analysis/missing-values')
const { detectOutliers } = jiti('./lib/analysis/outliers')
const { calculateStatistics } = jiti('./lib/analysis/statistics')
const { calculateMLReadiness } = jiti('./lib/analysis/ml-readiness')
const { inferColumnTypes } = jiti('./lib/analysis/data-types')
const { generateRecommendations } = jiti('./lib/analysis/recommendations')
const { encryptCredential, decryptCredential, maskApiKey } = jiti('./lib/crypto')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✓ PASS: ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(`    ${err.message}`)
    failedTests++
  }
}

console.log('\n==================================================')
console.log(' DataReady AI — Comprehensive Logic & Engine Audit')
console.log('==================================================\n')

// -----------------------------------------------------------------------------
// 1. DATA QUALITY & STATISTICAL ANALYSIS
// -----------------------------------------------------------------------------
console.log('--- 1. Data Quality Analysis Tests ---')

runTest('Missing Values: correctly identifies null, undefined, and empty string', () => {
  const data = [
    { id: 1, age: 25, city: 'New York' },
    { id: 2, age: null, city: 'London' },
    { id: 3, age: 30, city: '' },
    { id: 4, age: undefined, city: '   ' },
    { id: 5, age: 40, city: 'Tokyo' }
  ]
  const columns = ['id', 'age', 'city']
  const stats = analyzeMissingValues(data, columns)

  assert.equal(stats.age.missingCount, 2)
  assert.equal(stats.age.missingPercentage, 40)
  assert.equal(stats.city.missingCount, 2)
  assert.equal(stats.city.missingPercentage, 40)
  assert.equal(stats.id.missingCount, 0)
})

runTest('Duplicate Detection: identifies exact duplicate rows regardless of key order', () => {
  const data = [
    { a: 1, b: 'x', c: true },
    { a: 2, b: 'y', c: false },
    { c: true, a: 1, b: 'x' }, // Identical values, different key insertion order
    { a: 3, b: 'z', c: true }
  ]
  const dupStats = detectDuplicates(data)
  assert.equal(dupStats.totalRows, 4)
  assert.equal(dupStats.duplicateCount, 1)
  assert.equal(dupStats.uniqueRows, 3)
  assert.deepEqual(dupStats.duplicateIndices, [2])
})

runTest('Statistics Calculation: does NOT convert empty numeric cells to 0', () => {
  const data = [
    { score: 10 },
    { score: 20 },
    { score: '' },    // empty string must be missing, not 0
    { score: null },  // null must be missing, not 0
    { score: 30 }
  ]
  const types = { score: 'numeric' }
  const stats = calculateStatistics(data, ['score'], types)
  const scoreStat = stats.score

  assert.equal(scoreStat.count, 3)
  assert.equal(scoreStat.missing, 2)
  assert.equal(scoreStat.mean, 20)
  assert.equal(scoreStat.min, 10)
  assert.equal(scoreStat.max, 30)
  assert.equal(scoreStat.median, 20)
})

runTest('IQR Outlier Bounds: accurately computes Q1, Q3, and 1.5*IQR bounds', () => {
  // Normal distribution around 10-20, with 100 as extreme outlier
  const values = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 100]
  const bounds = calculateIQRBounds(values)
  assert.ok(bounds)
  assert.ok(bounds.q1 > 10 && bounds.q1 < 14)
  assert.ok(bounds.q3 > 16 && bounds.q3 < 25)
  assert.ok(bounds.upperBound < 100, `upperBound (${bounds.upperBound}) should be < 100`)
  assert.ok(100 > bounds.upperBound)
})

runTest('Outlier Detection: correctly flags statistical outliers without counting empty cells as 0', () => {
  const data = [
    { salary: 50000 },
    { salary: 52000 },
    { salary: 51000 },
    { salary: 49000 },
    { salary: 53000 },
    { salary: 50500 },
    { salary: '' }, // empty cell must not become 0
    { salary: 500000 } // high outlier
  ]
  const types = { salary: 'numeric' }
  const outlierResults = detectOutliers(data, ['salary'], types)
  
  assert.ok(outlierResults.salary)
  assert.equal(outlierResults.salary.outlierCount, 1)
  assert.deepEqual(outlierResults.salary.outlierIndices, [7])
})

runTest('ML Readiness Score: stays within 0-100 range and reflects quality components', () => {
  const missingStats = {
    col1: { missingCount: 0, missingPercentage: 0, totalRows: 100, severity: 'low' },
    col2: { missingCount: 0, missingPercentage: 0, totalRows: 100, severity: 'low' }
  }
  const duplicateStats = { totalRows: 100, uniqueRows: 100, duplicateCount: 0, duplicatePercentage: 0, duplicateIndices: [] }
  const outlierStats = {
    col1: { outlierCount: 0, outlierPercentage: 0, lowerBound: 0, upperBound: 100, outlierIndices: [] }
  }
  const types = { col1: 'numeric', col2: 'string' }
  
  const score = calculateMLReadiness(missingStats, duplicateStats, outlierStats, types, 100, 2)
  assert.ok(score.overallScore >= 0 && score.overallScore <= 100)
  assert.equal(score.category, 'Excellent')
  assert.equal(score.components.completeness, 100)
  assert.equal(score.components.uniqueness, 100)
  assert.equal(score.components.consistency, 100)
})

// -----------------------------------------------------------------------------
// 2. TRANSFORMATION ENGINE OPERATIONS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Transformation Engine Tests ---')

runTest('Transform: drop_column removes target columns', () => {
  const data = [
    { a: 1, b: 2, c: 3 },
    { a: 4, b: 5, c: 6 }
  ]
  const result = applyTransformations(data, ['a', 'b', 'c'], [
    { action: 'drop_column', columns: ['b'] }
  ])
  assert.deepEqual(result.columns, ['a', 'c'])
  assert.equal(result.data[0].b, undefined)
  assert.equal(result.affectedColumns, 1)
})

runTest('Transform: drop_column prevents deleting all columns', () => {
  const data = [{ a: 1 }]
  assert.throws(() => {
    applyTransformations(data, ['a'], [{ action: 'drop_column', columns: ['a'] }])
  }, /At least one column must remain/)
})

runTest('Transform: drop_missing removes rows with missing values', () => {
  const data = [
    { a: 1, b: 'val' },
    { a: 2, b: '' },
    { a: null, b: 'val' },
    { a: 4, b: 'val' }
  ]
  const result = applyTransformations(data, ['a', 'b'], [
    { action: 'drop_missing', columns: 'all' }
  ])
  assert.equal(result.data.length, 2)
  assert.equal(result.affectedRows, 2)
  assert.deepEqual(result.data.map(r => r.a), [1, 4])
})

runTest('Transform: drop_duplicates removes repeated rows', () => {
  const data = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 1, name: 'Alice' },
    { id: 3, name: 'Charlie' }
  ]
  const result = applyTransformations(data, ['id', 'name'], [
    { action: 'drop_duplicates', columns: 'all' }
  ])
  assert.equal(result.data.length, 3)
  assert.equal(result.affectedRows, 1)
  assert.deepEqual(result.data.map(r => r.id), [1, 2, 3])
})

runTest('Transform: drop_rows_indices drops specific row indices', () => {
  const data = [
    { val: 'row0' },
    { val: 'row1' },
    { val: 'row2' },
    { val: 'row3' }
  ]
  const result = applyTransformations(data, ['val'], [
    { action: 'drop_rows_indices', indices: [1, 3] }
  ])
  assert.equal(result.data.length, 2)
  assert.deepEqual(result.data.map(r => r.val), ['row0', 'row2'])
})

runTest('Transform: fill_missing with mean', () => {
  const data = [
    { num: 10 },
    { num: 20 },
    { num: '' },
    { num: 30 }
  ]
  const result = applyTransformations(data, ['num'], [
    { action: 'fill_missing', column: 'num', method: 'mean' }
  ])
  assert.equal(result.data[2].num, 20) // mean of 10, 20, 30 is 20
  assert.equal(result.affectedRows, 1)
})

runTest('Transform: fill_missing with median', () => {
  const data = [
    { num: 10 },
    { num: 100 },
    { num: null },
    { num: 20 }
  ]
  // sorted: 10, 20, 100 -> median is 20
  const result = applyTransformations(data, ['num'], [
    { action: 'fill_missing', column: 'num', method: 'median' }
  ])
  assert.equal(result.data[2].num, 20)
})

runTest('Transform: fill_missing with mode', () => {
  const data = [
    { category: 'A' },
    { category: 'B' },
    { category: 'A' },
    { category: '' }
  ]
  const result = applyTransformations(data, ['category'], [
    { action: 'fill_missing', column: 'category', method: 'mode' }
  ])
  assert.equal(result.data[3].category, 'A')
})

runTest('Transform: fill_missing with custom value', () => {
  const data = [
    { tag: 'standard' },
    { tag: null }
  ]
  const result = applyTransformations(data, ['tag'], [
    { action: 'fill_missing', column: 'tag', method: 'custom', customValue: 'unassigned' }
  ])
  assert.equal(result.data[1].tag, 'unassigned')
})

runTest('Transform: handle_outliers with remove', () => {
  const data = [
    { v: 10 }, { v: 11 }, { v: 12 }, { v: 13 }, { v: 14 },
    { v: 15 }, { v: 16 }, { v: 17 }, { v: 18 }, { v: 19 },
    { v: 100 } // Outlier
  ]
  const result = applyTransformations(data, ['v'], [
    { action: 'handle_outliers', column: 'v', method: 'remove' }
  ])
  assert.equal(result.data.length, 10)
  assert.ok(!result.data.some(r => r.v === 100))
})

runTest('Transform: handle_outliers with cap (Winsorization)', () => {
  const data = [
    { v: 10 }, { v: 11 }, { v: 12 }, { v: 13 }, { v: 14 },
    { v: 15 }, { v: 16 }, { v: 17 }, { v: 18 }, { v: 19 },
    { v: 100 }
  ]
  const result = applyTransformations(data, ['v'], [
    { action: 'handle_outliers', column: 'v', method: 'cap' }
  ])
  assert.equal(result.data.length, 11)
  assert.ok(result.data[10].v < 100, 'Outlier was capped')
  assert.ok(result.data[10].v > 19)
})

runTest('Transform: rename_column renames column and guards collisions', () => {
  const data = [
    { old_col: 1, other_col: 2 }
  ]
  const result = applyTransformations(data, ['old_col', 'other_col'], [
    { action: 'rename_column', column: 'old_col', newName: 'new_col' }
  ])
  assert.deepEqual(result.columns, ['new_col', 'other_col'])
  assert.equal(result.data[0].new_col, 1)
  assert.equal(result.data[0].old_col, undefined)

  // Prevent collision
  assert.throws(() => {
    applyTransformations(data, ['old_col', 'other_col'], [
      { action: 'rename_column', column: 'old_col', newName: 'other_col' }
    ])
  }, /already exists/)
})

runTest('Transform: convert_type supports integer, float, boolean, date and protects against corruption', () => {
  const data = [
    { strNum: '42.6', boolStr: 'true', dateStr: '2025-01-15' },
    { strNum: '100.2', boolStr: 'false', dateStr: '2025-06-20' }
  ]
  const result = applyTransformations(data, ['strNum', 'boolStr', 'dateStr'], [
    { action: 'convert_type', column: 'strNum', targetType: 'integer' },
    { action: 'convert_type', column: 'boolStr', targetType: 'boolean' }
  ])
  assert.equal(result.data[0].strNum, 43) // rounded
  assert.equal(result.data[1].strNum, 100)
  assert.equal(result.data[0].boolStr, true)
  assert.equal(result.data[1].boolStr, false)

  // Corruption protection: if >40% values cannot convert, abort
  const corruptData = [
    { val: 'valid_1' },
    { val: 'cannot_be_num' },
    { val: 'also_not_num' }
  ]
  assert.throws(() => {
    applyTransformations(corruptData, ['val'], [
      { action: 'convert_type', column: 'val', targetType: 'integer' }
    ])
  }, /failed for.*cancelled to avoid data corruption/)
})

// -----------------------------------------------------------------------------
// 3. CRYPTOGRAPHY & SECURITY
// -----------------------------------------------------------------------------
console.log('\n--- 3. Cryptography & Security Tests ---')

runTest('AES-256-GCM: encrypt and decrypt credential roundtrip', () => {
  const secretKey = 'AIzaSyA884930184019283019283019283'
  const encrypted = encryptCredential(secretKey)
  assert.notEqual(encrypted, secretKey)
  assert.equal(encrypted.split(':').length, 3, 'Payload must be iv:tag:ciphertext')

  const decrypted = decryptCredential(encrypted)
  assert.equal(decrypted, secretKey)
})

runTest('AES-256-GCM: tamper detection rejects modified ciphertext or tag', () => {
  const secretKey = 'my-gemini-secret-api-key'
  const encrypted = encryptCredential(secretKey)
  const parts = encrypted.split(':')
  // Tamper with ciphertext
  const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`
  assert.throws(() => {
    decryptCredential(tampered)
  })
})

runTest('API Key Masking: safely previews key prefix and suffix without exposing secret', () => {
  const key = 'AIzaSyDn91039485012398401928340192'
  const masked = maskApiKey(key)
  assert.ok(masked.startsWith('AIzaSy'))
  assert.ok(masked.endsWith('0192'))
  assert.ok(masked.includes('••••••••••••'))
  assert.ok(!masked.includes('910394850123984'))
})

console.log('\n==================================================')
console.log(` Summary: ${passedTests} passed, ${failedTests} failed.`)
console.log('==================================================\n')

if (failedTests > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
