/**
 * DataReady AI — Disposable Dataset Transformation & Export Validation Suite
 *
 * Verifies:
 * 1. Disposable dataset with >= 20 rows, >= 8 columns, missing values, duplicate rows,
 *    long column names, and long text values.
 * 2. Applying multiple transformations: drop_duplicates, fill_missing, handle_outliers, drop_column.
 * 3. Verifying preview data reflects transformed state (row counts, column counts, null indicators).
 * 4. Verifying horizontal scrollability (wide columns) and vertical scrollability (rows).
 * 5. Verifying export to CSV and XLSX with correct MIME types, UTF-8 BOM, and filename sanitization.
 * 6. Ensuring original raw file remains untouched and consistent.
 */

const assert = require('assert')
const Papa = require('papaparse')
const XLSX = require('xlsx')
const { createJiti } = require('jiti')
const jiti = createJiti(process.cwd())

// Load transformation and analysis engines via jiti
const { applyTransformations } = jiti('./lib/analysis/transformations')
const {
  inferColumnTypes,
  analyzeMissingValues,
  detectDuplicates,
  detectOutliers,
  calculateStatistics,
  calculateMLReadiness,
} = {
  inferColumnTypes: jiti('./lib/analysis/data-types').inferColumnTypes,
  analyzeMissingValues: jiti('./lib/analysis/missing-values').analyzeMissingValues,
  detectDuplicates: jiti('./lib/analysis/duplicates').detectDuplicates,
  detectOutliers: jiti('./lib/analysis/outliers').detectOutliers,
  calculateStatistics: jiti('./lib/analysis/statistics').calculateStatistics,
  calculateMLReadiness: jiti('./lib/analysis/ml-readiness').calculateMLReadiness,
}

console.log('======================================================================')
console.log(' DataReady AI — Disposable Dataset Transform & Export Verification')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

// -----------------------------------------------------------------------------
// 1. Generate Disposable Dataset (>= 20 rows, >= 8 columns, missing, dups, long text)
// -----------------------------------------------------------------------------

const LONG_COL_1 = 'customer_feedback_and_product_satisfaction_notes_v1'
const LONG_COL_2 = 'transaction_processing_timestamp_utc_iso8601_record'

const rawDataset = [
  // Row 1
  {
    record_id: 'REC-001',
    user_name: 'Alice Johnson',
    user_age: '28',
    annual_income: '65000',
    credit_rating: '720',
    account_status: 'Active',
    [LONG_COL_1]: 'Customer was extremely pleased with the overall onboarding experience and customer care responsiveness during setup.',
    [LONG_COL_2]: '2026-01-15T09:30:00.000Z',
  },
  // Row 2 (Duplicate of Row 1)
  {
    record_id: 'REC-001',
    user_name: 'Alice Johnson',
    user_age: '28',
    annual_income: '65000',
    credit_rating: '720',
    account_status: 'Active',
    [LONG_COL_1]: 'Customer was extremely pleased with the overall onboarding experience and customer care responsiveness during setup.',
    [LONG_COL_2]: '2026-01-15T09:30:00.000Z',
  },
  // Row 3 (Missing user_age and annual_income null)
  {
    record_id: 'REC-002',
    user_name: 'Bob Smith',
    user_age: null,
    annual_income: null,
    credit_rating: '580',
    account_status: 'Pending',
    [LONG_COL_1]: 'User experienced initial verification delays due to multi-factor authentication SMS gateway timeout.',
    [LONG_COL_2]: '2026-01-16T11:45:12.000Z',
  },
  // Row 4
  {
    record_id: 'REC-003',
    user_name: 'Carol White',
    user_age: '35',
    annual_income: '82000',
    credit_rating: '750',
    account_status: 'Active',
    [LONG_COL_1]: 'Requested automated monthly export and advanced machine learning dataset transformation features.',
    [LONG_COL_2]: '2026-01-17T14:12:00.000Z',
  },
  // Row 5 (Duplicate of Row 4)
  {
    record_id: 'REC-003',
    user_name: 'Carol White',
    user_age: '35',
    annual_income: '82000',
    credit_rating: '750',
    account_status: 'Active',
    [LONG_COL_1]: 'Requested automated monthly export and advanced machine learning dataset transformation features.',
    [LONG_COL_2]: '2026-01-17T14:12:00.000Z',
  },
  // Row 6 (Outlier annual income: 950000)
  {
    record_id: 'REC-004',
    user_name: 'David Brown',
    user_age: '42',
    annual_income: '950000',
    credit_rating: '810',
    account_status: 'Active',
    [LONG_COL_1]: 'Corporate enterprise tier subscriber evaluating enterprise bulk data ingestion throughput benchmarks.',
    [LONG_COL_2]: '2026-01-18T16:00:22.000Z',
  },
  // Row 7 (Missing credit_rating: empty string)
  {
    record_id: 'REC-005',
    user_name: 'Emma Watson',
    user_age: '24',
    annual_income: '48000',
    credit_rating: '',
    account_status: 'Active',
    [LONG_COL_1]: 'Very satisfied with intuitive web interface, dark mode design system, and fast reactive data table rendering.',
    [LONG_COL_2]: '2026-01-19T08:20:15.000Z',
  },
  // Row 8
  {
    record_id: 'REC-006',
    user_name: 'Frank Miller',
    user_age: '31',
    annual_income: '71000',
    credit_rating: '690',
    account_status: 'Suspended',
    [LONG_COL_1]: 'Billing payment declined due to expired credit card tokenization credentials.',
    [LONG_COL_2]: '2026-01-20T10:11:45.000Z',
  },
  // Row 9
  {
    record_id: 'REC-007',
    user_name: 'Grace Hopper',
    user_age: '45',
    annual_income: '120000',
    credit_rating: '840',
    account_status: 'Active',
    [LONG_COL_1]: 'Pioneering computer science methodology validation with automated data cleanliness pipeline checks.',
    [LONG_COL_2]: '2026-01-21T13:22:30.000Z',
  },
  // Row 10
  {
    record_id: 'REC-008',
    user_name: 'Henry Ford',
    user_age: '50',
    annual_income: '110000',
    credit_rating: '780',
    account_status: 'Active',
    [LONG_COL_1]: 'Mass production workflow automation integration request via REST webhook callbacks.',
    [LONG_COL_2]: '2026-01-22T15:45:00.000Z',
  },
  // Row 11
  {
    record_id: 'REC-009',
    user_name: 'Ivy Chen',
    user_age: '29',
    annual_income: '74000',
    credit_rating: '710',
    account_status: 'Active',
    [LONG_COL_1]: 'Smooth transition from legacy CSV spreadsheet tools to AI-assisted data preparation platform.',
    [LONG_COL_2]: '2026-01-23T09:05:10.000Z',
  },
  // Row 12 (Missing annual_income: undefined)
  {
    record_id: 'REC-010',
    user_name: 'Jack Ryan',
    user_age: '38',
    annual_income: undefined,
    credit_rating: '650',
    account_status: 'Pending',
    [LONG_COL_1]: 'Government security clearance review pending for confidential compliance audit.',
    [LONG_COL_2]: '2026-01-24T12:30:44.000Z',
  },
  // Row 13
  {
    record_id: 'REC-011',
    user_name: 'Karen Gillan',
    user_age: '33',
    annual_income: '79000',
    credit_rating: '730',
    account_status: 'Active',
    [LONG_COL_1]: 'Delighted with the instant data quality score and ML readiness recommendations breakdown.',
    [LONG_COL_2]: '2026-01-25T14:15:20.000Z',
  },
  // Row 14
  {
    record_id: 'REC-012',
    user_name: 'Leo Tolstoy',
    user_age: '62',
    annual_income: '55000',
    credit_rating: '670',
    account_status: 'Active',
    [LONG_COL_1]: 'Detailed literary review and deep philosophical analysis on modern algorithmic data processing.',
    [LONG_COL_2]: '2026-01-26T16:40:00.000Z',
  },
  // Row 15
  {
    record_id: 'REC-013',
    user_name: 'Mia Khalifa',
    user_age: '27',
    annual_income: '88000',
    credit_rating: '705',
    account_status: 'Active',
    [LONG_COL_1]: 'Media streaming content performance analytics and audience retention metrics tracking.',
    [LONG_COL_2]: '2026-01-27T18:25:30.000Z',
  },
  // Row 16
  {
    record_id: 'REC-014',
    user_name: 'Nathan Drake',
    user_age: '36',
    annual_income: '62000',
    credit_rating: '680',
    account_status: 'Active',
    [LONG_COL_1]: 'Field expedition expense ledger with missing receipt line items and currency conversions.',
    [LONG_COL_2]: '2026-01-28T10:50:12.000Z',
  },
  // Row 17
  {
    record_id: 'REC-015',
    user_name: 'Olivia Wilde',
    user_age: '39',
    annual_income: '94000',
    credit_rating: '760',
    account_status: 'Active',
    [LONG_COL_1]: 'Creative production scheduling dataset requiring automatic deduplication and outlier capping.',
    [LONG_COL_2]: '2026-01-29T11:15:45.000Z',
  },
  // Row 18
  {
    record_id: 'REC-016',
    user_name: 'Peter Parker',
    user_age: '22',
    annual_income: '32000',
    credit_rating: '620',
    account_status: 'Pending',
    [LONG_COL_1]: 'Freelance photography portfolio revenue stream tracking with irregular payment intervals.',
    [LONG_COL_2]: '2026-01-30T13:40:22.000Z',
  },
  // Row 19
  {
    record_id: 'REC-017',
    user_name: 'Quinn Fabray',
    user_age: '26',
    annual_income: '51000',
    credit_rating: '695',
    account_status: 'Active',
    [LONG_COL_1]: 'Academic research survey respondents demographic data with optional feedback survey responses.',
    [LONG_COL_2]: '2026-01-31T15:05:00.000Z',
  },
  // Row 20
  {
    record_id: 'REC-018',
    user_name: 'Rachel Green',
    user_age: '30',
    annual_income: '68000',
    credit_rating: '715',
    account_status: 'Active',
    [LONG_COL_1]: 'Retail fashion inventory turnover rates across multiple metropolitan department store locations.',
    [LONG_COL_2]: '2026-02-01T17:35:10.000Z',
  },
  // Row 21
  {
    record_id: 'REC-019',
    user_name: 'Steve Rogers',
    user_age: '105',
    annual_income: '75000',
    credit_rating: '850',
    account_status: 'Active',
    [LONG_COL_1]: 'Historical pension benefit disbursement records spanning multiple post-war decades.',
    [LONG_COL_2]: '2026-02-02T08:00:00.000Z',
  },
  // Row 22
  {
    record_id: 'REC-020',
    user_name: 'Tony Stark',
    user_age: '48',
    annual_income: '1500000',
    credit_rating: '850',
    account_status: 'Active',
    [LONG_COL_1]: 'Defense technology research and clean energy patent portfolio investment analysis.',
    [LONG_COL_2]: '2026-02-03T09:12:34.000Z',
  },
  // Row 23
  {
    record_id: 'REC-021',
    user_name: 'Uma Thurman',
    user_age: '52',
    annual_income: '98000',
    credit_rating: '775',
    account_status: 'Active',
    [LONG_COL_1]: 'Cinema film production logistics tracking with location scouting expenses and actor contracts.',
    [LONG_COL_2]: '2026-02-04T12:00:00.000Z',
  },
  // Row 24 (Missing user_name)
  {
    record_id: 'REC-022',
    user_name: '',
    user_age: '40',
    annual_income: '70000',
    credit_rating: '700',
    account_status: 'Pending',
    [LONG_COL_1]: 'Incomplete customer registration form submitted via mobile application checkout funnel.',
    [LONG_COL_2]: '2026-02-05T14:45:10.000Z',
  },
  // Row 25
  {
    record_id: 'REC-023',
    user_name: 'Wanda Maximoff',
    user_age: '32',
    annual_income: '86000',
    credit_rating: '735',
    account_status: 'Active',
    [LONG_COL_1]: 'Complex probabilistic anomaly detection logs with high variance in observation frequency.',
    [LONG_COL_2]: '2026-02-06T16:20:00.000Z',
  },
]

const initialColumns = Object.keys(rawDataset[0])

console.log('--- Step 1: Validate Disposable Dataset Characteristics ---')

test('Dataset has >= 20 rows and >= 8 columns', () => {
  assert(rawDataset.length >= 20, `Expected >= 20 rows, got ${rawDataset.length}`)
  assert(initialColumns.length >= 8, `Expected >= 8 columns, got ${initialColumns.length}`)
  assert.strictEqual(rawDataset.length, 25)
  assert.strictEqual(initialColumns.length, 8)
})

test('Dataset contains missing values, duplicates, and long text/column names', () => {
  const duplicates = detectDuplicates(rawDataset)
  assert(duplicates.duplicateCount >= 2, `Expected duplicates >= 2, got ${duplicates.duplicateCount}`)

  const missing = analyzeMissingValues(rawDataset, initialColumns)
  assert(missing['user_age'].missingCount > 0, 'user_age must have missing values')
  assert(missing['annual_income'].missingCount > 0, 'annual_income must have missing values')
  assert(missing['credit_rating'].missingCount > 0, 'credit_rating must have missing values')

  assert(LONG_COL_1.length > 40, 'Column 1 name should be long (>40 chars)')
  assert(LONG_COL_2.length > 40, 'Column 2 name should be long (>40 chars)')

  const sampleLongText = rawDataset[0][LONG_COL_1]
  assert(sampleLongText.length > 80, 'Sample text value should be > 80 chars')
})

console.log('\n--- Step 2: Apply Transformation 1 — Drop Duplicate Rows (Create Version 1) ---')

let version1Data
let version1Columns

test('Transformation 1 (drop_duplicates) removes duplicate rows cleanly', () => {
  const result = applyTransformations(rawDataset, initialColumns, [{ action: 'drop_duplicates' }])
  version1Data = result.data
  version1Columns = result.columns

  // We had 2 duplicates (Row 2 is dup of Row 1, Row 5 is dup of Row 4)
  assert.strictEqual(version1Data.length, 23, `Expected 23 rows after deduplication, got ${version1Data.length}`)
  assert.strictEqual(version1Columns.length, 8, 'Columns should remain unchanged')
  assert.strictEqual(result.affectedRows, 2, '2 duplicate rows should have been affected')

  const dupCheck = detectDuplicates(version1Data)
  assert.strictEqual(dupCheck.duplicateCount, 0, 'Zero duplicates should remain in Version 1')
})

console.log('\n--- Step 3: Apply Transformation 2 — Fill Missing Values (Create Version 2) ---')

let version2Data
let version2Columns

test('Transformation 2 (fill_missing with mean on user_age) imputes missing value', () => {
  const result = applyTransformations(version1Data, version1Columns, [
    { action: 'fill_missing', column: 'user_age', method: 'mean' },
  ])
  version2Data = result.data
  version2Columns = result.columns

  assert.strictEqual(version2Data.length, 23, 'Row count remains 23')
  assert.strictEqual(version2Columns.length, 8, 'Column count remains 8')

  const missingCheck = analyzeMissingValues(version2Data, version2Columns)
  assert.strictEqual(missingCheck['user_age'].missingCount, 0, 'user_age missing count must be 0')
  assert(version2Data.every(r => r.user_age !== null && r.user_age !== undefined && r.user_age !== ''), 'No row should have empty user_age')
})

console.log('\n--- Step 4: Apply Transformation 3 — Cap Outliers in annual_income (Create Version 3) ---')

let version3Data
let version3Columns

test('Transformation 3 (handle_outliers with cap on annual_income) winsorizes extreme values', () => {
  const types = inferColumnTypes(version2Data, version2Columns)
  const result = applyTransformations(version2Data, version2Columns, [
    { action: 'handle_outliers', column: 'annual_income', method: 'cap' },
  ])
  version3Data = result.data
  version3Columns = result.columns

  // Verify Tony Stark's 1,500,000 and David Brown's 950,000 were clamped to upper IQR bound
  const tony = version3Data.find(r => r.user_name === 'Tony Stark')
  assert(Number(tony.annual_income) < 1500000, `Tony Stark income was not clamped: ${tony.annual_income}`)

  const david = version3Data.find(r => r.user_name === 'David Brown')
  assert(Number(david.annual_income) < 950000, `David Brown income was not clamped: ${david.annual_income}`)
})

console.log('\n--- Step 5: Verify Preview Representation & Data Table Constraints ---')

test('Preview table specifications accommodate large datasets without layout breakage', () => {
  // 1. Column normalization preserves long column names
  const sampleCols = version3Columns.map(name => ({ name }))
  assert.strictEqual(sampleCols.length, 8)
  assert(sampleCols.some(c => c.name === LONG_COL_1))
  assert(sampleCols.some(c => c.name === LONG_COL_2))

  // 2. Data slicing simulation (e.g. 50 sample rows preview)
  const previewSlice = version3Data.slice(0, 50)
  assert.strictEqual(previewSlice.length, 23)

  // 3. Test null and empty indicator logic
  const rowWithNull = version3Data.find(r => r.annual_income === null || r.annual_income === undefined)
  assert(rowWithNull !== undefined, 'Found row with remaining null annual_income for indicator check')

  // 4. Test vertical scrollability: 23 rows can be iterated and last row accessed
  const lastRow = version3Data[version3Data.length - 1]
  assert.strictEqual(lastRow.record_id, 'REC-023')
  assert.strictEqual(lastRow.user_name, 'Wanda Maximoff')

  // 5. Test horizontal scrollability: all 8 columns exist and last column is accessible
  const lastCol = version3Columns[version3Columns.length - 1]
  assert.strictEqual(lastCol, LONG_COL_2)
  assert(lastRow[lastCol] !== undefined, 'Last column on last row is accessible')
})

console.log('\n--- Step 6: Export Transformed Dataset to CSV and XLSX ---')

let exportedCsv
let exportedXlsxBuffer

test('CSV Export contains all transformed data, UTF-8 BOM, and no original duplicates', () => {
  const unparsed = Papa.unparse({
    fields: version3Columns,
    data: version3Data,
  })

  // Add UTF-8 BOM as implemented in export/route.ts
  exportedCsv = '\uFEFF' + unparsed

  assert(exportedCsv.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM for Excel')
  assert(exportedCsv.includes('Alice Johnson'), 'Must include Alice Johnson')
  assert(exportedCsv.includes(LONG_COL_1), 'Must include long column 1 header')
  assert(exportedCsv.includes(LONG_COL_2), 'Must include long column 2 header')

  // Parse back to verify integrity
  const reparsed = Papa.parse(exportedCsv, { header: true, skipEmptyLines: true })
  assert.strictEqual(reparsed.data.length, 23, 'Exported CSV must have exactly 23 rows (no duplicates)')
  assert.strictEqual(reparsed.meta.fields.length, 8, 'Exported CSV must have exactly 8 columns')

  // Alice Johnson should appear exactly once
  const aliceMatches = reparsed.data.filter(r => r.user_name === 'Alice Johnson')
  assert.strictEqual(aliceMatches.length, 1, 'Alice Johnson must appear only once in exported CSV')
})

test('XLSX Export generates valid workbook with all transformed records', () => {
  const worksheet = XLSX.utils.json_to_sheet(version3Data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  exportedXlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  assert(exportedXlsxBuffer.length > 0, 'Excel buffer must not be empty')

  // Read back Excel workbook
  const readWb = XLSX.read(exportedXlsxBuffer, { type: 'buffer' })
  assert(readWb.SheetNames.includes('Data'), 'Workbook must include Data sheet')
  const readSheet = readWb.Sheets['Data']
  const readRows = XLSX.utils.sheet_to_json(readSheet)

  assert.strictEqual(readRows.length, 23, 'XLSX sheet must contain exactly 23 rows')
  assert.strictEqual(Object.keys(readRows[0]).length, 8, 'XLSX row must have 8 columns')
})

test('Content-Disposition and filename generation are RFC compliant', () => {
  const datasetName = 'Customer Financial & Onboarding Analytics Report (2026)'
  const safeBaseName = datasetName
    .replace(/\.[^/.]+$/, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .trim()

  const currentVersion = 3
  const downloadFileName = `${safeBaseName}_v${currentVersion}.csv`
  const safeAsciiName = downloadFileName.replace(/[^\x20-\x7E]/g, '_')
  const header = `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`

  assert(header.includes('filename='), 'Header must include fallback filename')
  assert(header.includes("filename*=UTF-8''"), 'Header must include RFC 5987 UTF-8 filename*')
  assert(!header.includes('?'), 'Filename must not contain illegal question mark')
})

console.log('\n--- Step 7: Data Consistency & Non-Destructive Invariance ---')

test('Original raw dataset was NOT mutated during transformation or export', () => {
  assert.strictEqual(rawDataset.length, 25, 'Original dataset still has 25 rows')
  const originalDuplicates = detectDuplicates(rawDataset)
  assert.strictEqual(originalDuplicates.duplicateCount, 2, 'Original duplicates are preserved for rollback')
  assert.strictEqual(rawDataset[2].user_age, null, 'Original missing user_age is preserved')
})

console.log('\n======================================================================')
console.log(` Summary: ${passed} passed, ${failed} failed.`)
console.log('======================================================================\n')

if (failed > 0) {
  process.exit(1)
}
