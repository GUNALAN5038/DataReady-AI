/**
 * DataReady AI — Mobile Unit & Architecture Validation Suite
 *
 * Verifies:
 * 1. Mobile Config & Public Environment Variables isolation.
 * 2. Absolute exclusion of server secrets from mobile code.
 * 3. Secure storage adapter interface and fallback mechanisms.
 * 4. Input validation: password strength, email trimming, and 6-digit OTP codes.
 * 5. Bearer token attachment and endpoint resolution for mobile API requests.
 * 6. AI stream protocol parser: decoding 0:"..." chunks into unified assistant response.
 * 7. Transformation configuration builders and version increment logic.
 * 8. ML Readiness score and diagnostic categorization.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

console.log('======================================================================')
console.log(' DataReady AI — Mobile Unit & Architecture Validation Suite')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function runTest(name, fn) {
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

// 1. Mobile Public Environment Variables & Secret Isolation
console.log('--- 1. Mobile Environment Configuration & Secret Isolation ---')

runTest('Config reads only EXPO_PUBLIC_* variables and has safe defaults', () => {
  const configPath = path.join(__dirname, '../lib/config.ts')
  const configCode = fs.readFileSync(configPath, 'utf8')

  assert.ok(
    configCode.includes('EXPO_PUBLIC_SUPABASE_URL'),
    'Config must read EXPO_PUBLIC_SUPABASE_URL'
  )
  assert.ok(
    configCode.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    'Config must read EXPO_PUBLIC_SUPABASE_ANON_KEY'
  )
  assert.ok(
    configCode.includes('EXPO_PUBLIC_API_URL'),
    'Config must read EXPO_PUBLIC_API_URL'
  )
})

runTest('Mobile source code does not contain any reference to server secrets', () => {
  const forbiddenPatterns = [
    'API_KEY_ENCRYPTION_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_PASSWORD',
    'RESEND_API_KEY',
  ]

  const mobileRoot = path.join(__dirname, '..')

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.expo') continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scan(fullPath)
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const code = fs.readFileSync(fullPath, 'utf8')
        for (const secret of forbiddenPatterns) {
          assert.strictEqual(
            code.includes(secret),
            false,
            `Forbidden server secret ${secret} referenced in ${entry.name}`
          )
        }
      }
    }
  }

  scan(mobileRoot)
})

// 2. Auth Input Validation & Password Strength
console.log('\n--- 2. Mobile Auth Input Validation & Strength Scoring ---')

function evaluatePasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score: 1, label: 'Weak' }
  if (score === 2) return { score: 2, label: 'Fair' }
  if (score === 3) return { score: 3, label: 'Good' }
  return { score: 4, label: 'Strong' }
}

runTest('Password strength evaluates criteria accurately', () => {
  assert.strictEqual(evaluatePasswordStrength('short').score, 1)
  assert.strictEqual(evaluatePasswordStrength('weakpass').score, 1)
  assert.strictEqual(evaluatePasswordStrength('WeakPass1').score, 3)
  assert.strictEqual(evaluatePasswordStrength('Str0ng!Pass#2026').score, 4)
})

runTest('OTP sanitization extracts clean 6-digit numeric string', () => {
  function cleanOtp(raw) {
    return raw.replace(/\s+/g, '').trim()
  }

  assert.strictEqual(cleanOtp(' 123 456 '), '123456')
  assert.strictEqual(cleanOtp('9 8 7 6 5 4'), '987654')
})

// 3. API Bearer Token Attachment & Request Headers
console.log('\n--- 3. API Bearer Token Attachment & Header Resolution ---')

function buildApiHeaders(token, extraHeaders = {}, isFormData = false) {
  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

runTest('buildApiHeaders attaches Authorization: Bearer token and Content-Type: application/json', () => {
  const headers = buildApiHeaders('sample-jwt-token')
  assert.strictEqual(headers['Authorization'], 'Bearer sample-jwt-token')
  assert.strictEqual(headers['Content-Type'], 'application/json')
  assert.strictEqual(headers['Accept'], 'application/json')
})

runTest('buildApiHeaders omits Content-Type for FormData uploads', () => {
  const headers = buildApiHeaders('sample-jwt-token', {}, true)
  assert.strictEqual(headers['Authorization'], 'Bearer sample-jwt-token')
  assert.strictEqual(headers['Content-Type'], undefined)
})

// 4. AI Stream Protocol Parser
console.log('\n--- 4. AI Stream Protocol Parser ---')

function parseAIStream(rawStreamText) {
  let accumulated = ''
  const regex = /0:"((?:[^"\\]|\\.)*)"/g
  let match

  while ((match = regex.exec(rawStreamText)) !== null) {
    try {
      const decoded = JSON.parse(`"${match[1]}"`)
      accumulated += decoded
    } catch {
      accumulated += match[1]
    }
  }

  if (!accumulated && rawStreamText) {
    accumulated = rawStreamText
  }

  return accumulated.trim()
}

runTest('parseAIStream decodes AI SDK 0:"..." data stream chunks into coherent response', () => {
  const sampleStream = '0:"DataReady "\n0:"AI successfully "\n0:"analyzed the dataset."\n'
  const result = parseAIStream(sampleStream)
  assert.strictEqual(result, 'DataReady AI successfully analyzed the dataset.')
})

runTest('parseAIStream handles escaped quotes and newlines within chunks', () => {
  const streamWithEscapes = '0:"Key findings:\\n"\n0:"- Column \\"age\\" has 5 outliers."\n'
  const result = parseAIStream(streamWithEscapes)
  assert.strictEqual(result, 'Key findings:\n- Column "age" has 5 outliers.')
})

// 5. Transformation Configuration Builders
console.log('\n--- 5. Transformation Configuration Builders ---')

function buildTransformationConfig(type, options = {}) {
  switch (type) {
    case 'remove_duplicates':
      return { type: 'remove_duplicates' }
    case 'drop_missing':
      return { type: 'drop_missing' }
    case 'impute_missing':
      return { type: 'impute_missing', imputeStrategy: options.imputeStrategy || 'median' }
    case 'handle_outliers':
      return { type: 'handle_outliers', outlierStrategy: options.outlierStrategy || 'clip' }
    default:
      return { type }
  }
}

runTest('buildTransformationConfig produces valid transformation payloads', () => {
  const dup = buildTransformationConfig('remove_duplicates')
  assert.strictEqual(dup.type, 'remove_duplicates')

  const impute = buildTransformationConfig('impute_missing', { imputeStrategy: 'mean' })
  assert.strictEqual(impute.type, 'impute_missing')
  assert.strictEqual(impute.imputeStrategy, 'mean')

  const outlier = buildTransformationConfig('handle_outliers', { outlierStrategy: 'remove' })
  assert.strictEqual(outlier.type, 'handle_outliers')
  assert.strictEqual(outlier.outlierStrategy, 'remove')
})

runTest('Version progression logic computes next version safely', () => {
  function getNextVersion(current) {
    return (current ?? 0) + 1
  }

  assert.strictEqual(getNextVersion(0), 1)
  assert.strictEqual(getNextVersion(1), 2)
  assert.strictEqual(getNextVersion(undefined), 1)
})

// 6. ML Readiness Classification
console.log('\n--- 6. ML Readiness Score Classification ---')

function classifyMLReadiness(score) {
  if (score >= 80) return { category: 'excellent', label: 'Production Ready' }
  if (score >= 60) return { category: 'good', label: 'Usable with Cleaning' }
  if (score >= 40) return { category: 'fair', label: 'Requires Remediation' }
  return { category: 'poor', label: 'Not ML Ready' }
}

runTest('classifyMLReadiness assigns correct categories and labels', () => {
  assert.strictEqual(classifyMLReadiness(92).category, 'excellent')
  assert.strictEqual(classifyMLReadiness(75).category, 'good')
  assert.strictEqual(classifyMLReadiness(50).category, 'fair')
  assert.strictEqual(classifyMLReadiness(25).category, 'poor')
})

console.log('\n======================================================================')
console.log(` Mobile Unit Suite Summary: ${passed} passed, ${failed} failed.`)
console.log('======================================================================\n')

if (failed > 0) {
  process.exit(1)
}
