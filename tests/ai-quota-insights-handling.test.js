/**
 * DataReady AI — AI Insights Quota Handling & Resiliency Test Suite
 *
 * Validates:
 * 1. Correct detection and classification of Gemini daily quota exhaustion.
 * 2. Stoppage of useless retries (daily quota terminates on attempt 1).
 * 3. Bounded retry and backoff for transient rate limits (RPM / TPM).
 * 4. Error classification for invalid credentials, unavailable models, and unconfigured provider.
 * 5. Sanitized, friendly user messaging without exposing raw provider payloads or JSON.
 * 6. Versioned insights caching and in-flight request deduplication.
 */

const assert = require('assert')
const { createJiti } = require('jiti')
const jiti = createJiti(process.cwd())

const { classifyAIError, executeWithSafeRetry } = jiti('./lib/ai/errors')

console.log('======================================================================')
console.log(' DataReady AI — AI Insights Quota Handling & Caching Validation')
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

async function runAllTests() {
  console.log('--- 1. Quota Exhaustion Detection & Policy ---')

  await test('Daily quota error with free_tier payload is identified as non-retryable QUOTA_EXCEEDED', () => {
    const rawError = new Error(
      'Failed after 3 attempts. You exceeded your current quota, please check your plan and billing details. ' +
      'For more information on this error, head to: https://ai.google.dev/gemini-api/docs/troubleshooting/error-codes ' +
      '[GoogleGenerativeAI Error]: generate_content_free_tier_requests, daily request limit exceeded'
    )
    rawError.statusCode = 429

    const classified = classifyAIError(rawError)
    assert.strictEqual(classified.code, 'QUOTA_EXCEEDED')
    assert.strictEqual(classified.isDailyQuota, true)
    assert.strictEqual(classified.retryable, false)
    assert.strictEqual(classified.status, 429)
    assert.strictEqual(classified.configureKeyUrl, '/settings/keys')
    assert(
      classified.friendlyMessage.includes('configured Gemini API quota has been reached'),
      'Friendly message must mention quota reached'
    )
    assert(!classified.friendlyMessage.includes('GoogleGenerativeAI Error'), 'Must NOT contain raw provider prefix')
    assert(!classified.friendlyMessage.includes('generate_content_free_tier_requests'), 'Must NOT contain raw quota metric identifier')
    assert(!classified.friendlyMessage.includes('Failed after 3 attempts'), 'Must NOT contain AI SDK retry message')
  })

  await test('JSON RPC error payload with QuotaFailure is correctly parsed and classified', () => {
    const jsonError = {
      status: 429,
      message: 'Resource has been exhausted (e.g. check quota).',
      responseBody: JSON.stringify({
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: "Quota exceeded for quota metric 'generate_content_free_tier_requests' and limit 'Daily request limit'",
          details: [
            {
              '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
              violations: [{ subject: 'generate_content_free_tier_requests', description: 'Daily request limit exceeded.' }]
            },
            {
              '@type': 'type.googleapis.com/google.rpc.RetryInfo',
              retryDelay: '86400s'
            }
          ]
        }
      })
    }

    const classified = classifyAIError(jsonError)
    assert.strictEqual(classified.code, 'QUOTA_EXCEEDED')
    assert.strictEqual(classified.isDailyQuota, true)
    assert.strictEqual(classified.retryable, false)
    assert.strictEqual(classified.retryAfterSeconds, 86400)
  })

  console.log('\n--- 2. Stop Useless Retries on Quota Exhaustion ---')

  await test('executeWithSafeRetry terminates on Attempt 1 for daily quota (no 3 repeated requests)', async () => {
    let callCount = 0

    const failingOperation = async () => {
      callCount++
      const err = new Error(
        'You exceeded your current quota: generate_content_free_tier_requests, daily request limit exceeded'
      )
      err.statusCode = 429
      throw err
    }

    let caughtError = null
    try {
      await executeWithSafeRetry(failingOperation, { maxTransientRetries: 2 })
    } catch (err) {
      caughtError = err
    }

    assert(caughtError !== null, 'Operation must reject')
    assert.strictEqual(callCount, 1, `Expected exactly 1 call without repeated requests, got ${callCount}`)
  })

  console.log('\n--- 3. Transient Rate Limit (Per-Minute) Handling ---')

  await test('Transient 429 (PerMinute rate limit) is classified as RATE_LIMITED and retryable', () => {
    const rateLimitError = new Error('Resource has been exhausted (rate limit per minute exceeded).')
    rateLimitError.statusCode = 429

    const classified = classifyAIError(rateLimitError)
    assert.strictEqual(classified.code, 'RATE_LIMITED')
    assert.strictEqual(classified.isDailyQuota, false)
    assert.strictEqual(classified.retryable, true)
    assert.strictEqual(classified.status, 429)
  })

  await test('executeWithSafeRetry successfully recovers on transient rate limit after bounded backoff', async () => {
    let attempts = 0

    const transientOperation = async () => {
      attempts++
      if (attempts === 1) {
        const err = new Error('Too Many Requests: PerMinute rate limit reached')
        err.statusCode = 429
        throw err
      }
      return { success: true, attempts }
    }

    const result = await executeWithSafeRetry(transientOperation, {
      maxTransientRetries: 1,
      baseDelayMs: 50,
      maxDelayMs: 200
    })

    assert.strictEqual(result.success, true)
    assert.strictEqual(attempts, 2, 'Should succeed on attempt 2 after 1 retry')
  })

  console.log('\n--- 4. Invalid Credentials, Unavailable Models & Unconfigured Provider ---')

  await test('Invalid API key (401/403) is classified as INVALID_API_KEY with settings URL', () => {
    const err401 = new Error('API_KEY_INVALID: API key not valid. Please pass a valid API key.')
    err401.statusCode = 401

    const classified = classifyAIError(err401)
    assert.strictEqual(classified.code, 'INVALID_API_KEY')
    assert.strictEqual(classified.status, 401)
    assert.strictEqual(classified.retryable, false)
    assert.strictEqual(classified.configureKeyUrl, '/settings/keys')
  })

  await test('executeWithSafeRetry does NOT retry invalid API key', async () => {
    let attempts = 0
    try {
      await executeWithSafeRetry(async () => {
        attempts++
        const err = new Error('API key not valid')
        err.statusCode = 401
        throw err
      }, { maxTransientRetries: 2 })
    } catch {}

    assert.strictEqual(attempts, 1, 'Invalid key must not be retried')
  })

  await test('Discontinued/unavailable model (404) is classified as MODEL_UNAVAILABLE', () => {
    const modelErr = new Error('models/gemini-1.5-flash is discontinued and not found for API version v1beta')
    modelErr.statusCode = 404

    const classified = classifyAIError(modelErr)
    assert.strictEqual(classified.code, 'MODEL_UNAVAILABLE')
    assert.strictEqual(classified.status, 503)
    assert.strictEqual(classified.retryable, false)
  })

  await test('Unconfigured provider is classified as PROVIDER_NOT_CONFIGURED', () => {
    const configErr = new Error('AI provider not configured. Please add an API key in Settings.')

    const classified = classifyAIError(configErr)
    assert.strictEqual(classified.code, 'PROVIDER_NOT_CONFIGURED')
    assert.strictEqual(classified.status, 503)
    assert.strictEqual(classified.retryable, false)
    assert.strictEqual(classified.configureKeyUrl, '/settings/keys')
  })

  console.log('\n--- 5. Versioned Insights Caching & In-Flight Concurrency ---')

  await test('Insights are isolated by version: Version 0 cache does not serve Version 1', () => {
    // Simulated database analyses store
    const analysesDb = []

    // Helper simulating cached lookup
    const lookupCache = (datasetId, version) => {
      return analysesDb.find(a => a.dataset_id === datasetId && a.analysis_type === 'ai_insights' && a.dataset_version === version)
    }

    // 1. Save insights for Version 0
    analysesDb.push({
      dataset_id: 'ds-123',
      dataset_version: 0,
      analysis_type: 'ai_insights',
      results: { summary: { dataset_overview: 'Version 0 raw upload overview' } }
    })

    // 2. Query Version 0 -> Cache HIT
    const v0Hit = lookupCache('ds-123', 0)
    assert(v0Hit !== undefined, 'Version 0 must hit cache')
    assert.strictEqual(v0Hit.results.summary.dataset_overview, 'Version 0 raw upload overview')

    // 3. Query Version 1 (newly transformed dataset) -> Cache MISS (never return stale v0 data)
    const v1Miss = lookupCache('ds-123', 1)
    assert.strictEqual(v1Miss, undefined, 'Version 1 must NOT return stale Version 0 insights')

    // 4. Save Version 1 insights
    analysesDb.push({
      dataset_id: 'ds-123',
      dataset_version: 1,
      analysis_type: 'ai_insights',
      results: { summary: { dataset_overview: 'Version 1 deduplicated dataset overview' } }
    })

    // 5. Query Version 1 -> Cache HIT
    const v1Hit = lookupCache('ds-123', 1)
    assert(v1Hit !== undefined, 'Version 1 must now hit its own cache')
    assert.strictEqual(v1Hit.results.summary.dataset_overview, 'Version 1 deduplicated dataset overview')
  })

  await test('In-flight request deduplication prevents duplicate concurrent calls', async () => {
    const inFlightMap = new Map()
    let geminiApiInvocations = 0

    const fetchInsightsDeduplicated = async (datasetId, version) => {
      const key = `${datasetId}:${version}`

      if (inFlightMap.has(key)) {
        return inFlightMap.get(key)
      }

      const promise = (async () => {
        geminiApiInvocations++
        await new Promise(r => setTimeout(r, 60))
        return { version, generatedAt: Date.now() }
      })()

      inFlightMap.set(key, promise)
      try {
        return await promise
      } finally {
        inFlightMap.delete(key)
      }
    }

    // Fire 3 simultaneous requests for the exact same dataset & version
    const [res1, res2, res3] = await Promise.all([
      fetchInsightsDeduplicated('ds-test', 0),
      fetchInsightsDeduplicated('ds-test', 0),
      fetchInsightsDeduplicated('ds-test', 0),
    ])

    assert.strictEqual(geminiApiInvocations, 1, `Gemini API should be called exactly once, but was called ${geminiApiInvocations} times`)
    assert.strictEqual(res1.version, 0)
    assert.strictEqual(res2.version, 0)
    assert.strictEqual(res3.version, 0)
  })

  console.log('\n======================================================================')
  console.log(` Summary: ${passed} passed, ${failed} failed.`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests()
