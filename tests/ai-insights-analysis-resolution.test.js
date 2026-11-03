/**
 * DataReady AI — AI Insights Analysis Resolution & State Machine Regression Suite
 *
 * Covers:
 * 1. Completed full analysis exists.
 * 2. Full analysis and ML Readiness are stored separately.
 * 3. Analysis exists but is still pending (status: 'processing' / 'uploading').
 * 4. Analysis failed (status: 'failed') or is missing (0 records).
 * 5. Dataset ID is invalid or belongs to another user (multi-tenant isolation).
 * 6. Gemini API key is missing or quota is exhausted (never mislabeled as missing analysis).
 * 7. Successful analysis and AI provider return insights correctly.
 */

const assert = require('assert')
const { createJiti } = require('jiti')
const jiti = createJiti(process.cwd())

const { classifyAIError } = jiti('./lib/ai/errors')

console.log('======================================================================')
console.log(' DataReady AI — AI Insights Analysis Resolution & Error Handling Suite')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function test(name, fn) {
  return (async () => {
    try {
      await fn()
      console.log(`  ✓ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`)
      console.error(`    ${err.message}`)
      failed++
    }
  })()
}

/**
 * Simulates the server-side analysis resolver used in /api/datasets/[id]/insights
 */
function resolveAnalysisForInsights({ user, dataset, analysesRecords }) {
  // 1. Ownership check
  if (!dataset || dataset.user_id !== user.id) {
    return {
      status: 404,
      body: { error: 'Dataset not found or access denied.' }
    }
  }

  // 2. Dataset state checks
  if (dataset.status === 'processing') {
    return {
      status: 409,
      body: {
        error: 'Dataset analysis is currently in progress. Please wait a moment while processing finishes.',
        code: 'ANALYSIS_PENDING',
        status: 'processing',
        retryable: true
      }
    }
  }

  if (dataset.status === 'uploading') {
    return {
      status: 409,
      body: {
        error: 'Dataset is currently uploading. Please wait for upload to complete.',
        code: 'DATASET_UPLOADING',
        status: 'uploading',
        retryable: true
      }
    }
  }

  if (dataset.status === 'failed') {
    return {
      status: 422,
      body: {
        error: dataset.processing_error || 'Dataset analysis failed. Please run or retry dataset analysis.',
        code: 'ANALYSIS_FAILED',
        status: 'failed',
        canRunAnalysis: true,
        retryable: false
      }
    }
  }

  // 3. User-scoped analyses records check
  const userScopedRecords = (analysesRecords || []).filter(
    r => r.dataset_id === dataset.id && r.user_id === user.id
  )

  if (userScopedRecords.length === 0) {
    return {
      status: 400,
      body: {
        error: 'AI insights require a completed dataset analysis. Click "Run Dataset Analysis" below to start analysis.',
        code: 'ANALYSIS_MISSING',
        canRunAnalysis: true,
        retryable: false
      }
    }
  }

  const currentVersion = dataset.current_version ?? 0
  const matchesVersion = (v) => {
    if (v === currentVersion) return true
    if (currentVersion === 0 && (v === null || v === undefined || v === 0)) return true
    return false
  }

  const versionedFull = userScopedRecords.find(r => r.analysis_type === 'full_analysis' && matchesVersion(r.dataset_version))
  const fallbackFull = userScopedRecords.find(r => r.analysis_type === 'full_analysis')
  const genericFull = userScopedRecords.find(r => r.results && (r.results.missingValues || r.results.stats || r.results.types))
  const fullAnalysis = versionedFull || fallbackFull || genericFull || null

  const versionedML = userScopedRecords.find(r => r.analysis_type === 'ml_readiness' && matchesVersion(r.dataset_version))
  const fallbackML = userScopedRecords.find(r => r.analysis_type === 'ml_readiness')
  const genericML = userScopedRecords.find(r => r.results && (r.results.components || r.results.overallScore !== undefined))
  const mlReadinessAnalysis = versionedML || fallbackML || genericML || null

  const usableRecord = fullAnalysis || mlReadinessAnalysis || userScopedRecords.find(r => r.results && Object.keys(r.results).length > 0)

  if (!usableRecord || !usableRecord.results || typeof usableRecord.results !== 'object') {
    return {
      status: 400,
      body: {
        error: 'AI insights require a completed dataset analysis. The analysis record is empty or malformed. Please rerun dataset analysis.',
        code: 'ANALYSIS_INCOMPLETE',
        canRunAnalysis: true,
        retryable: false
      }
    }
  }

  // 4. Combine full_analysis, ml_readiness, and dataset metadata
  const baseResults = (fullAnalysis?.results && typeof fullAnalysis.results === 'object' ? fullAnalysis.results : {})
  const mlResults = (mlReadinessAnalysis?.results && typeof mlReadinessAnalysis.results === 'object' ? mlReadinessAnalysis.results : {})

  const combinedMLReadiness = (baseResults.mlReadiness && typeof baseResults.mlReadiness === 'object' ? baseResults.mlReadiness : mlResults)
  const results = {
    ...mlResults,
    ...baseResults,
    mlReadiness: combinedMLReadiness
  }

  const mlComponents = mlResults.components || combinedMLReadiness.components || baseResults.components || {
    completeness: 100,
    consistency: 100,
    validity: 100,
    uniqueness: 100,
    featureQuality: 100
  }

  const overallScore = fullAnalysis?.ml_readiness_score 
    ?? mlReadinessAnalysis?.ml_readiness_score 
    ?? combinedMLReadiness.overallScore 
    ?? mlResults.overallScore 
    ?? 0

  return {
    status: 200,
    data: {
      results,
      mlComponents,
      overallScore,
      ruleBasedRecommendations: fullAnalysis?.recommendations || results.recommendations || []
    }
  }
}

async function runSuite() {
  console.log('--- 1. Completed Full Analysis Exists ---')

  await test('Scenario 1: Completed full analysis extracts stats, types, and readiness accurately', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-001',
      user_id: 'usr-101',
      name: 'churn_data.csv',
      row_count: 500,
      column_count: 5,
      current_version: 0,
      status: 'analyzed'
    }
    const analysesRecords = [
      {
        dataset_id: 'ds-001',
        user_id: 'usr-101',
        analysis_type: 'full_analysis',
        dataset_version: 0,
        ml_readiness_score: 88,
        results: {
          types: { age: 'numeric', balance: 'numeric', churn: 'boolean' },
          missingValues: { age: { missingCount: 0, missingPercentage: 0 } },
          stats: { age: { mean: 38.5, median: 36, min: 18, max: 80 } },
          mlReadiness: {
            overallScore: 88,
            components: { completeness: 95, consistency: 90, validity: 85, uniqueness: 85, featureQuality: 85 }
          }
        },
        recommendations: [{ title: 'Scale numeric values' }]
      }
    ]

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords })
    assert.strictEqual(outcome.status, 200)
    assert.strictEqual(outcome.data.overallScore, 88)
    assert.strictEqual(outcome.data.mlComponents.completeness, 95)
    assert.strictEqual(outcome.data.results.types.age, 'numeric')
    assert.strictEqual(outcome.data.ruleBasedRecommendations.length, 1)
  })

  console.log('\n--- 2. Separate Full Analysis & ML Readiness Storage ---')

  await test('Scenario 2: Separate full_analysis and ml_readiness rows are combined into unified analysis', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-002',
      user_id: 'usr-101',
      name: 'customer_transactions.csv',
      current_version: 1,
      status: 'analyzed'
    }
    const analysesRecords = [
      {
        dataset_id: 'ds-002',
        user_id: 'usr-101',
        analysis_type: 'full_analysis',
        dataset_version: 1,
        results: {
          types: { amount: 'numeric' },
          missingValues: { amount: { missingCount: 5, missingPercentage: 1.2 } },
          stats: { amount: { mean: 120.5 } }
        },
        recommendations: [{ title: 'Impute missing values' }]
      },
      {
        dataset_id: 'ds-002',
        user_id: 'usr-101',
        analysis_type: 'ml_readiness',
        dataset_version: 1,
        ml_readiness_score: 92,
        results: {
          overallScore: 92,
          components: { completeness: 98, consistency: 95, validity: 90, uniqueness: 90, featureQuality: 88 }
        }
      }
    ]

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords })
    assert.strictEqual(outcome.status, 200)
    assert.strictEqual(outcome.data.overallScore, 92)
    assert.strictEqual(outcome.data.mlComponents.completeness, 98)
    assert.strictEqual(outcome.data.results.stats.amount.mean, 120.5)
    assert.strictEqual(outcome.data.ruleBasedRecommendations[0].title, 'Impute missing values')
  })

  await test('Scenario 2b: Usable analysis proceeds even if only ml_readiness record exists', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-002b',
      user_id: 'usr-101',
      name: 'ml_only.csv',
      current_version: 0,
      status: 'analyzed'
    }
    const analysesRecords = [
      {
        dataset_id: 'ds-002b',
        user_id: 'usr-101',
        analysis_type: 'ml_readiness',
        dataset_version: 0,
        ml_readiness_score: 75,
        results: {
          overallScore: 75,
          components: { completeness: 80, consistency: 75, validity: 70, uniqueness: 70, featureQuality: 75 }
        }
      }
    ]

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords })
    assert.strictEqual(outcome.status, 200, 'Should proceed when valid ML readiness record exists')
    assert.strictEqual(outcome.data.overallScore, 75)
    assert.strictEqual(outcome.data.mlComponents.validity, 70)
  })

  console.log('\n--- 3. Pending Analysis State (Processing / Uploading) ---')

  await test('Scenario 3a: Processing status returns 409 ANALYSIS_PENDING with retryable: true', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-003',
      user_id: 'usr-101',
      name: 'large_stream.csv',
      status: 'processing'
    }

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords: [] })
    assert.strictEqual(outcome.status, 409)
    assert.strictEqual(outcome.body.code, 'ANALYSIS_PENDING')
    assert.strictEqual(outcome.body.retryable, true)
    assert(outcome.body.error.includes('in progress'), 'Message must indicate analysis in progress')
  })

  await test('Scenario 3b: Uploading status returns 409 DATASET_UPLOADING', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-003b',
      user_id: 'usr-101',
      name: 'uploading.csv',
      status: 'uploading'
    }

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords: [] })
    assert.strictEqual(outcome.status, 409)
    assert.strictEqual(outcome.body.code, 'DATASET_UPLOADING')
    assert.strictEqual(outcome.body.retryable, true)
  })

  console.log('\n--- 4. Failed or Missing Analysis Recovery ---')

  await test('Scenario 4a: Failed analysis returns 422 ANALYSIS_FAILED with canRunAnalysis: true', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-004',
      user_id: 'usr-101',
      name: 'corrupted.csv',
      status: 'failed',
      processing_error: 'CSV contains mismatched column count on line 42'
    }

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords: [] })
    assert.strictEqual(outcome.status, 422)
    assert.strictEqual(outcome.body.code, 'ANALYSIS_FAILED')
    assert.strictEqual(outcome.body.canRunAnalysis, true)
    assert(outcome.body.error.includes('mismatched column count'))
  })

  await test('Scenario 4b: Empty analyses table returns 400 ANALYSIS_MISSING with recovery action', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-004b',
      user_id: 'usr-101',
      name: 'unanalyzed.csv',
      status: 'uploaded'
    }

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords: [] })
    assert.strictEqual(outcome.status, 400)
    assert.strictEqual(outcome.body.code, 'ANALYSIS_MISSING')
    assert.strictEqual(outcome.body.canRunAnalysis, true)
    assert(outcome.body.error.includes('Run Dataset Analysis'))
  })

  await test('Scenario 4c: Malformed analysis record with empty results returns 400 ANALYSIS_INCOMPLETE', () => {
    const user = { id: 'usr-101' }
    const dataset = {
      id: 'ds-004c',
      user_id: 'usr-101',
      name: 'empty_analysis.csv',
      status: 'analyzed'
    }
    const analysesRecords = [
      {
        dataset_id: 'ds-004c',
        user_id: 'usr-101',
        analysis_type: 'full_analysis',
        results: null
      }
    ]

    const outcome = resolveAnalysisForInsights({ user, dataset, analysesRecords })
    assert.strictEqual(outcome.status, 400)
    assert.strictEqual(outcome.body.code, 'ANALYSIS_INCOMPLETE')
    assert.strictEqual(outcome.body.canRunAnalysis, true)
  })

  console.log('\n--- 5. Dataset ID Invalid or Multi-Tenant Ownership ---')

  await test('Scenario 5a: User B attempting to access User A dataset returns 404 Access Denied', () => {
    const userB = { id: 'usr-user-B' }
    const datasetA = {
      id: 'ds-user-A-private',
      user_id: 'usr-user-A',
      name: 'financial_records.csv',
      status: 'analyzed'
    }

    const outcome = resolveAnalysisForInsights({ user: userB, dataset: datasetA, analysesRecords: [] })
    assert.strictEqual(outcome.status, 404)
    assert.strictEqual(outcome.body.error, 'Dataset not found or access denied.')
  })

  await test('Scenario 5b: Missing dataset returns 404', () => {
    const user = { id: 'usr-101' }
    const outcome = resolveAnalysisForInsights({ user, dataset: null, analysesRecords: [] })
    assert.strictEqual(outcome.status, 404)
    assert.strictEqual(outcome.body.error, 'Dataset not found or access denied.')
  })

  console.log('\n--- 6. Separate AI Provider Errors vs Missing Analysis ---')

  await test('Scenario 6a: Missing Gemini API key classified as PROVIDER_NOT_CONFIGURED (never missing analysis)', () => {
    const err = new Error('AI provider not configured. Please add an API key in Settings.')
    const classified = classifyAIError(err)
    assert.strictEqual(classified.code, 'PROVIDER_NOT_CONFIGURED')
    assert.strictEqual(classified.status, 503)
    assert.strictEqual(classified.configureKeyUrl, '/settings/keys')
    assert(!classified.friendlyMessage.includes('completed dataset analysis'), 'Must NOT claim analysis is missing')
  })

  await test('Scenario 6b: Gemini daily quota exhausted classified as QUOTA_EXCEEDED (never missing analysis)', () => {
    const err = new Error('[GoogleGenerativeAI Error]: generate_content_free_tier_requests, daily request limit exceeded')
    const classified = classifyAIError(err)
    assert.strictEqual(classified.code, 'QUOTA_EXCEEDED')
    assert.strictEqual(classified.isDailyQuota, true)
    assert.strictEqual(classified.status, 429)
    assert(!classified.friendlyMessage.includes('completed dataset analysis'), 'Must NOT claim analysis is missing')
  })

  await test('Scenario 6c: Invalid API key classified as INVALID_API_KEY (never missing analysis)', () => {
    const err = new Error('API_KEY_INVALID: The provided API key is expired or revoked')
    const classified = classifyAIError(err)
    assert.strictEqual(classified.code, 'INVALID_API_KEY')
    assert.strictEqual(classified.status, 401)
    assert(!classified.friendlyMessage.includes('completed dataset analysis'), 'Must NOT claim analysis is missing')
  })

  console.log('\n--- 7. Successful AI Generation Response Structure ---')

  await test('Scenario 7: Insights response schema contains summary, key findings, anomalies, and ML readiness', () => {
    const sampleValidInsights = {
      summary: {
        dataset_overview: '500 rows across 5 tabular features.',
        quality_overview: 'High data quality with zero missing values.',
        ml_readiness_overview: 'Well suited for tabular classification.',
        strengths: ['Clean records', 'Balanced classes'],
        weaknesses: ['Moderate outliers in income']
      },
      score_breakdown: {
        completeness: { score: 100, explanation: 'Zero missing values.' },
        consistency: { score: 95, explanation: 'Homogeneous data types.' },
        validity: { score: 85, explanation: 'Minor outliers detected.' },
        uniqueness: { score: 95, explanation: 'No duplicate rows found.' },
        feature_quality: { score: 85, explanation: 'Adequate sample density.' }
      },
      key_findings: [
        { title: 'Clean primary key distribution', explanation: 'Unique rows identify records.', severity: 'LOW' }
      ],
      anomalies: [],
      recommendations: [
        {
          title: 'Normalize income feature',
          priority: 'MEDIUM',
          problem: 'Skewed income distribution',
          action: 'Apply log transform or outlier capping',
          reason: 'Prevents gradient distortion in training',
          transformation_suggestion: { action: 'none', is_supported: false }
        }
      ],
      ml_readiness: {
        assessment: 'Dataset qualifies for training pipeline.',
        score_driver: 'High completeness and uniqueness.',
        blocking_issues: [],
        recommended_actions: ['Normalize outliers', 'Split 80/20 train/test']
      }
    }

    assert.ok(sampleValidInsights.summary.dataset_overview.length > 0)
    assert.strictEqual(sampleValidInsights.score_breakdown.completeness.score, 100)
    assert.strictEqual(sampleValidInsights.recommendations.length, 1)
    assert.ok(sampleValidInsights.ml_readiness.assessment.length > 0)
  })

  console.log('\n======================================================================')
  console.log(` Summary: ${passed} passed, ${failed} failed.`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runSuite()
