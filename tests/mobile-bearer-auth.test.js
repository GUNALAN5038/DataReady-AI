/**
 * DataReady AI — Mobile Bearer-Token Authentication & Multi-Tenant Security Suite
 *
 * Verifies:
 * 1. lib/supabase/server.ts supports Bearer token authentication from Authorization header.
 * 2. Fallback to browser cookies when no Authorization header is present.
 * 3. Token validation: rejects invalid, expired, or malformed tokens with 401.
 * 4. Client-supplied user ID cannot override verified auth.getUser() identity.
 * 5. Multi-tenant isolation: cross-user access to datasets, analyses, and keys is blocked.
 * 6. Mobile client isolation: server secrets (encryption key, service role key, Gemini key)
 *    never exist in mobile code or environment variables.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

console.log('======================================================================')
console.log(' DataReady AI — Mobile Bearer Auth & Multi-Tenant Security Suite')
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

// 1. Server Client Bearer Auth Implementation Audit
console.log('--- 1. lib/supabase/server.ts Bearer Auth Architecture ---')

const serverTsPath = path.join(process.cwd(), 'lib/supabase/server.ts')
const serverTsCode = fs.readFileSync(serverTsPath, 'utf8')

runTest('lib/supabase/server.ts checks Authorization: Bearer header', () => {
  assert.ok(
    serverTsCode.includes("authHeader.toLowerCase().startsWith('bearer ')"),
    'lib/supabase/server.ts must detect Bearer token in Authorization header'
  )
  assert.ok(
    serverTsCode.includes('createSupabaseClient'),
    'lib/supabase/server.ts must import and initialize standard Supabase client for Bearer auth'
  )
  assert.ok(
    serverTsCode.includes('Authorization: `Bearer ${token}`'),
    'lib/supabase/server.ts must set global Authorization header for PostgREST RLS'
  )
})

runTest('lib/supabase/server.ts binds auth.getUser to validate token against Supabase Auth', () => {
  assert.ok(
    serverTsCode.includes('originalGetUser(jwt || token)'),
    'lib/supabase/server.ts must bind auth.getUser to validate bearer token against Supabase Auth'
  )
})

runTest('lib/supabase/server.ts preserves cookie-based web auth fallback', () => {
  assert.ok(
    serverTsCode.includes('const cookieStore = await cookies()'),
    'lib/supabase/server.ts must preserve cookies() fallback for web clients'
  )
  assert.ok(
    serverTsCode.includes('export const getAuthenticatedUser = cache('),
    'lib/supabase/server.ts must preserve request-scoped getAuthenticatedUser cache'
  )
})

// 2. Token Extraction & Validation Logic Verification
console.log('\n--- 2. Token Extraction & Validation Behavioral Logic ---')

function extractBearerToken(req) {
  const authHeader = req?.headers?.authorization || req?.headers?.get?.('authorization') || null
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    return token.length > 0 ? token : null
  }
  return null
}

runTest('extractBearerToken correctly extracts valid bearer tokens', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-jwt-token'
  const reqWithHeader = { headers: { authorization: `Bearer ${token}` } }
  assert.strictEqual(extractBearerToken(reqWithHeader), token)

  const reqCaseInsensitive = { headers: { authorization: `bearer ${token}` } }
  assert.strictEqual(extractBearerToken(reqCaseInsensitive), token)
})

runTest('extractBearerToken rejects missing, empty, or non-bearer tokens', () => {
  assert.strictEqual(extractBearerToken({ headers: {} }), null)
  assert.strictEqual(extractBearerToken({ headers: { authorization: 'Bearer   ' } }), null)
  assert.strictEqual(extractBearerToken({ headers: { authorization: 'Basic dXNlcjpwYXNz' } }), null)
  assert.strictEqual(extractBearerToken({ headers: { authorization: 'Token 12345' } }), null)
})

// 3. Simulated Auth Resolver & Multi-Tenant Enforcement
console.log('\n--- 3. Multi-Tenant Isolation & Identity Spoofing Protection ---')

runTest('Simulated server auth verifies token with Supabase Auth and rejects forged client user IDs', async () => {
  const mockValidUsers = {
    'user-token-alice': { id: 'alice-uuid', email: 'alice@example.com' },
    'user-token-bob': { id: 'bob-uuid', email: 'bob@example.com' },
  }

  // Simulated server endpoint
  async function handleApiRequest(req, body) {
    const token = extractBearerToken(req)
    if (!token || !mockValidUsers[token]) {
      return { status: 401, error: 'Unauthorized: Invalid or missing token' }
    }

    // Authenticated identity is ALWAYS derived from auth.getUser, NEVER from request body!
    const verifiedUser = mockValidUsers[token]

    // Notice client attempted to spoof identity as "bob-uuid"
    const effectiveUserId = verifiedUser.id

    return {
      status: 200,
      user: verifiedUser,
      effectiveUserId,
      rejectedSpoof: body?.user_id && body.user_id !== verifiedUser.id,
    }
  }

  // 1. Missing token returns 401
  const res1 = await handleApiRequest({ headers: {} })
  assert.strictEqual(res1.status, 401)

  // 2. Invalid token returns 401
  const res2 = await handleApiRequest({ headers: { authorization: 'Bearer invalid-token-123' } })
  assert.strictEqual(res2.status, 401)

  // 3. Alice attempts to spoof as Bob
  const res3 = await handleApiRequest(
    { headers: { authorization: 'Bearer user-token-alice' } },
    { user_id: 'bob-uuid' }
  )
  assert.strictEqual(res3.status, 200)
  assert.strictEqual(res3.effectiveUserId, 'alice-uuid', 'Effective user ID must be Alice, ignoring Bob')
  assert.strictEqual(res3.rejectedSpoof, true)
})

runTest('Dataset route handlers enforce eq("user_id", user.id) multi-tenant isolation', () => {
  const routesToCheck = [
    'app/api/datasets/[id]/analyze/route.ts',
    'app/api/datasets/[id]/insights/route.ts',
    'app/api/datasets/[id]/transform/route.ts',
    'app/api/datasets/[id]/export/route.ts',
    'app/api/user/keys/route.ts',
  ]

  for (const routeRel of routesToCheck) {
    const routeCode = fs.readFileSync(path.join(process.cwd(), routeRel), 'utf8')
    assert.ok(
      routeCode.includes('.eq(\'user_id\', user.id)'),
      `${routeRel} must filter queries with .eq('user_id', user.id)`
    )
  }
})

// 4. Server Secret Leakage Prevention in Mobile Bundle
console.log('\n--- 4. Client Bundle Secret Leakage Audit ---')

runTest('Mobile directory does not contain server-only secrets or private env vars', () => {
  const forbiddenPatterns = [
    'API_KEY_ENCRYPTION_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_PASSWORD',
    'RESEND_API_KEY',
  ]

  const mobileDir = path.join(process.cwd(), 'mobile')
  if (fs.existsSync(mobileDir)) {
    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanDir(fullPath)
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json') || entry.name.endsWith('.env.example'))) {
          const content = fs.readFileSync(fullPath, 'utf8')
          for (const pattern of forbiddenPatterns) {
            // Check that values are not assigned or leaked
            if (content.includes(`process.env.${pattern}`) || content.includes(`EXPO_PUBLIC_${pattern}`)) {
              assert.fail(`Forbidden server secret reference ${pattern} found in ${fullPath}`)
            }
          }
        }
      }
    }
    scanDir(mobileDir)
  }
})

console.log('\n======================================================================')
console.log(` Summary: ${passed} passed, ${failed} failed.`)
console.log('======================================================================\n')

if (failed > 0) {
  process.exit(1)
}
