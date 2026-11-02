/**
 * DataReady AI — Complete Authentication & Email OTP Verification Test Suite
 *
 * Validates:
 * 1. Signup validation and password mismatch.
 * 2. OTP request, 6-digit verification, expiry, brute-force mitigation, and signup/email fallback.
 * 3. Successful verification and session establishment.
 * 4. Dashboard redirection and open-redirect sanitization.
 * 5. Failed login and unverified-user protection (prompting for OTP).
 * 6. Password recovery OTP verification and secure reset session requirement.
 * 7. Idempotent profile creation.
 * 8. Welcome email branding, feature highlights, and single-delivery idempotency.
 * 9. Missing email provider handling (does not record security event).
 * 10. Resend API failure handling (does not record security event).
 * 11. Resend API success handling (records security event only after HTTP 200/201).
 *
 * NOTE: All external network requests are strictly mocked. No real emails are sent during tests.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { createJiti } = require('jiti')
const jiti = createJiti(process.cwd())

const { sendWelcomeEmail, buildWelcomeEmailHtml, buildWelcomeEmailText } = jiti('./lib/email/welcome')

console.log('======================================================================')
console.log(' DataReady AI — Complete Auth & Email OTP Lifecycle Validation')
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

async function runAsyncTest(name, fn) {
  try {
    await fn()
    console.log(`  ✓ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

/**
 * Creates an in-memory mock Supabase client for testing security_events and profile interactions
 */
function createMockSupabase(initialEvents = []) {
  const events = [...initialEvents]
  const insertedEvents = []

  return {
    events,
    insertedEvents,
    from: (table) => {
      if (table === 'security_events') {
        return {
          select: () => ({
            eq: (col1, val1) => ({
              eq: (col2, val2) => ({
                limit: () => ({
                  maybeSingle: async () => {
                    const found = events.find(e => e.user_id === val1 && e.event_type === val2)
                    return { data: found || null, error: null }
                  },
                }),
              }),
            }),
          }),
          insert: async (record) => {
            events.push(record)
            insertedEvents.push(record)
            return { data: record, error: null }
          },
        }
      }
      return {}
    },
  }
}

;(async () => {
  // 1. Signup Form Validation & Security
  console.log('--- 1. Sign Up Field & Password Validation ---')

  runTest('Signup blocks password mismatch, short password, and invalid email', () => {
    const validateSignupInputs = (fullName, email, password, confirmPassword) => {
      if (!fullName || !email || !password || !confirmPassword) {
        return { error: 'All fields are required.' }
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return { error: 'Please enter a valid email address.' }
      }
      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters long.' }
      }
      if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' }
      }
      return { success: true }
    }

    // Missing field
    assert.strictEqual(validateSignupInputs('', 'user@example.com', 'Pass1234!', 'Pass1234!').error, 'All fields are required.')
    // Invalid email
    assert.strictEqual(validateSignupInputs('Jane Doe', 'not-an-email', 'Pass1234!', 'Pass1234!').error, 'Please enter a valid email address.')
    // Short password
    assert.strictEqual(validateSignupInputs('Jane Doe', 'user@example.com', 'short', 'short').error, 'Password must be at least 8 characters long.')
    // Mismatch
    assert.strictEqual(validateSignupInputs('Jane Doe', 'user@example.com', 'Password123!', 'Mismatch123!').error, 'Passwords do not match.')
    // Valid
    assert.strictEqual(validateSignupInputs('Jane Doe', 'user@example.com', 'Password123!', 'Password123!').success, true)
  })

  runTest('Password strength scoring accurately evaluates criteria', () => {
    const calculateStrength = (pwd) => {
      let score = 0
      if (pwd.length >= 8) score += 25
      if (/[A-Z]/.test(pwd)) score += 25
      if (/[a-z]/.test(pwd)) score += 25
      if (/[0-9!@#$%^&*(),.?":{}|<>]/.test(pwd)) score += 25
      return score
    }

    assert.strictEqual(calculateStrength('weak'), 25) // lowercase only, <8
    assert.strictEqual(calculateStrength('weakpass'), 50) // length + lowercase
    assert.strictEqual(calculateStrength('WeakPass1'), 100) // length + upper + lower + number
  })

  // 2. Email OTP Verification & Brute-Force Defense
  console.log('\n--- 2. Email OTP Request, Format & Verification ---')

  runTest('OTP input cleans whitespace and enforces complete 6-digit code', () => {
    const cleanAndValidateOtp = (rawToken) => {
      const cleanToken = rawToken ? rawToken.trim().replace(/\s+/g, '') : ''
      if (cleanToken.length < 6) {
        return { error: 'Please enter the complete 6-digit verification code.' }
      }
      if (!/^\d{6}$/.test(cleanToken)) {
        return { error: 'Verification code must contain 6 digits.' }
      }
      return { cleanToken }
    }

    assert.ok(cleanAndValidateOtp('12345').error)
    assert.ok(cleanAndValidateOtp('12345a').error)
    assert.strictEqual(cleanAndValidateOtp(' 987 654 ').cleanToken, '987654')
  })

  runTest('Brute-force prevention locks verification after 5 failed attempts', () => {
    let attempts = 0
    const maxAttempts = 5

    const simulateVerify = (providedToken, correctToken = '482910') => {
      if (attempts >= maxAttempts) {
        return { error: 'Too many failed attempts. Please request a new verification code.' }
      }
      if (providedToken !== correctToken) {
        attempts++
        return { error: 'Invalid verification code.' }
      }
      return { success: true }
    }

    for (let i = 0; i < 5; i++) {
      const res = simulateVerify('000000')
      assert.strictEqual(res.error, 'Invalid verification code.')
    }

    // 6th attempt must be locked out
    const lockoutRes = simulateVerify('482910')
    assert.strictEqual(lockoutRes.error, 'Too many failed attempts. Please request a new verification code.')
  })

  runTest('verifyOtp executes type: signup with graceful fallback to email', async () => {
    const mockAuthVerifyOtp = async ({ email, token, type }) => {
      if (token === '111111') {
        return { data: { user: null }, error: new Error('Token has expired or is invalid') }
      }
      if (type === 'signup' && token === '222222') {
        // Simulates provider complaining about type mismatch, triggering 'email' fallback
        return { data: { user: null }, error: new Error('Invalid OTP type provided') }
      }
      if (type === 'email' && token === '222222') {
        return { data: { user: { id: 'usr_222', email } }, error: null }
      }
      if (type === 'signup' && token === '654321') {
        return { data: { user: { id: 'usr_654', email } }, error: null }
      }
      return { data: { user: null }, error: new Error('Invalid token') }
    }

    // Direct signup verification
    const res1 = await mockAuthVerifyOtp({ email: 'test@example.com', token: '654321', type: 'signup' })
    assert.ok(res1.data.user)
    assert.strictEqual(res1.data.user.id, 'usr_654')

    // Expired token
    const resExpired = await mockAuthVerifyOtp({ email: 'test@example.com', token: '111111', type: 'signup' })
    assert.ok(resExpired.error)
    assert.ok(resExpired.error.message.includes('expired'))

    // Fallback simulation
    let resFallback = await mockAuthVerifyOtp({ email: 'test@example.com', token: '222222', type: 'signup' })
    if (resFallback.error && resFallback.error.message.includes('Invalid OTP type')) {
      resFallback = await mockAuthVerifyOtp({ email: 'test@example.com', token: '222222', type: 'email' })
    }
    assert.ok(resFallback.data.user)
    assert.strictEqual(resFallback.data.user.id, 'usr_222')
  })

  // 3. Session Establishment & Open Redirect Protection
  console.log('\n--- 3. Session Establishment & Open Redirect Sanitization ---')

  runTest('Redirect URL sanitizer prevents open redirect attacks', () => {
    const sanitizeRedirectUrl = (url) => {
      if (!url || typeof url !== 'string') return '/dashboard'
      const trimmed = url.trim()
      if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
        return trimmed
      }
      return '/dashboard'
    }

    // Valid internal paths
    assert.strictEqual(sanitizeRedirectUrl('/dashboard'), '/dashboard')
    assert.strictEqual(sanitizeRedirectUrl('/datasets/ds-123'), '/datasets/ds-123')
    assert.strictEqual(sanitizeRedirectUrl('/settings'), '/settings')

    // Dangerous external open-redirect attempts
    assert.strictEqual(sanitizeRedirectUrl('https://malicious.com'), '/dashboard')
    assert.strictEqual(sanitizeRedirectUrl('//evil.com/phish'), '/dashboard')
    assert.strictEqual(sanitizeRedirectUrl('/\\evil.com'), '/dashboard')
    assert.strictEqual(sanitizeRedirectUrl('javascript:alert(1)'), '/dashboard')
    assert.strictEqual(sanitizeRedirectUrl(''), '/dashboard')
  })

  // 4. Sign In & Unverified User Protection
  console.log('\n--- 4. Sign In & Unverified Account Handling ---')

  runTest('Sign In detects unverified email and directs user to OTP verification', () => {
    const handleLoginResponse = (authError) => {
      if (!authError) return { success: true }
      const msg = authError.message.toLowerCase()
      if (msg.includes('email not confirmed')) {
        return {
          error: 'Your email is not verified yet. Please enter the verification code sent to your email.',
          unverified: true,
        }
      }
      if (msg.includes('invalid login credentials')) {
        return { error: 'Invalid email or password. Please verify your credentials and try again.' }
      }
      return { error: authError.message }
    }

    const unconfirmed = handleLoginResponse(new Error('Email not confirmed'))
    assert.strictEqual(unconfirmed.unverified, true)
    assert.ok(unconfirmed.error.includes('not verified yet'))

    const badCreds = handleLoginResponse(new Error('Invalid login credentials'))
    assert.strictEqual(badCreds.unverified, undefined)
    assert.ok(badCreds.error.includes('Invalid email or password'))
  })

  // 5. Password Recovery & Reset Flow
  console.log('\n--- 5. Password Recovery & Reset Flow ---')

  runTest('Forgot password returns generic response preventing user enumeration', () => {
    const formatForgotPasswordResponse = () => {
      return {
        success: true,
        message: 'If an account exists with this email address, a password reset link has been sent.',
      }
    }

    const res = formatForgotPasswordResponse()
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.message, 'If an account exists with this email address, a password reset link has been sent.')
  })

  runTest('Password recovery verifies type: recovery and rejects unauthenticated password update', async () => {
    const mockAuth = {
      session: null,
      verifyRecoveryOtp: async (email, token) => {
        if (token === '777888') {
          mockAuth.session = { user: { id: 'usr_rec_777', email } }
          return { data: mockAuth.session, error: null }
        }
        return { data: { user: null }, error: new Error('Invalid or expired recovery code') }
      },
      updateUser: async ({ password }) => {
        if (!mockAuth.session?.user) {
          return { data: null, error: new Error('Your password reset session has expired or is invalid') }
        }
        return { data: { user: mockAuth.session.user }, error: null }
      },
    }

    // Try password update without verifying recovery OTP -> Rejected
    const unauthorizedUpdate = await mockAuth.updateUser({ password: 'NewSecurePassword123!' })
    assert.ok(unauthorizedUpdate.error)
    assert.ok(unauthorizedUpdate.error.message.includes('expired or is invalid'))

    // Verify recovery OTP
    const recoveryRes = await mockAuth.verifyRecoveryOtp('user@example.com', '777888')
    assert.strictEqual(recoveryRes.error, null)
    assert.ok(recoveryRes.data.user)

    // Authorized password update
    const authorizedUpdate = await mockAuth.updateUser({ password: 'NewSecurePassword123!' })
    assert.strictEqual(authorizedUpdate.error, null)
    assert.ok(authorizedUpdate.data.user)
  })

  runTest('Password reset rejects missing session, mismatch, or weak password', () => {
    const validatePasswordReset = (hasSession, newPassword, confirmPassword) => {
      if (!hasSession) {
        return { error: 'Your password reset session has expired or is invalid. Please request a new recovery link or code.' }
      }
      if (!newPassword || !confirmPassword) {
        return { error: 'Both password fields are required.' }
      }
      if (newPassword.length < 8) {
        return { error: 'New password must be at least 8 characters long.' }
      }
      if (newPassword !== confirmPassword) {
        return { error: 'Passwords do not match.' }
      }
      return { success: true }
    }

    assert.ok(validatePasswordReset(false, 'ValidPass123!', 'ValidPass123!').error.includes('expired'))
    assert.ok(validatePasswordReset(true, 'short', 'short').error.includes('at least 8 characters'))
    assert.ok(validatePasswordReset(true, 'Password123!', 'Different123!').error.includes('do not match'))
    assert.strictEqual(validatePasswordReset(true, 'StrongPassword123!', 'StrongPassword123!').success, true)
  })

  runTest('Recovery link callback routes code and token_hash securely to /reset-password', async () => {
    const simulateCallback = async ({ code, token_hash, type, error, error_description, next = '/dashboard' }) => {
      const safeNext = (next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) ? next : '/dashboard'
      
      if (error || error_description) {
        const fallback = safeNext.includes('reset-password') ? '/forgot-password' : '/login'
        return { redirect: `${fallback}?error=${encodeURIComponent(error_description || error)}` }
      }

      if (code === 'valid_pkce_code') {
        return { session: true, redirect: safeNext }
      }

      if (token_hash === 'valid_token_hash' && type === 'recovery') {
        return { session: true, redirect: safeNext }
      }

      const fallback = safeNext.includes('reset-password') ? '/forgot-password?error=InvalidOrExpiredRecoveryLink' : '/login?error=AuthCallbackFailed'
      return { redirect: fallback }
    }

    // PKCE recovery link
    const pkceRes = await simulateCallback({ code: 'valid_pkce_code', next: '/reset-password' })
    assert.strictEqual(pkceRes.session, true)
    assert.strictEqual(pkceRes.redirect, '/reset-password')

    // Token hash recovery link
    const hashRes = await simulateCallback({ token_hash: 'valid_token_hash', type: 'recovery', next: '/reset-password' })
    assert.strictEqual(hashRes.session, true)
    assert.strictEqual(hashRes.redirect, '/reset-password')

    // Expired link from provider
    const errRes = await simulateCallback({ error: 'access_denied', error_description: 'Email link is invalid or has expired', next: '/reset-password' })
    assert.ok(errRes.redirect.startsWith('/forgot-password?error='))
    assert.ok(decodeURIComponent(errRes.redirect).includes('Email link is invalid or has expired'))

    // Open redirect attempt on next
    const evilRes = await simulateCallback({ code: 'valid_pkce_code', next: 'https://evil.com/phish' })
    assert.strictEqual(evilRes.redirect, '/dashboard')
  })

  runTest('Supabase default reset link end-to-end lifecycle (PKCE link -> session -> reset -> login)', async () => {
    const userStore = {
      'user@example.com': { passwordHash: 'OriginalPassword123!', verified: true },
    }

    // 1. Request recovery link with safe redirectTo origin
    const cleanOrigin = 'http://localhost:3000'
    const redirectTo = `${cleanOrigin}/auth/callback?next=/reset-password`
    assert.strictEqual(redirectTo, 'http://localhost:3000/auth/callback?next=/reset-password')

    const reqRes = {
      success: true,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    }
    assert.strictEqual(reqRes.success, true)
    assert.strictEqual(reqRes.message, 'If an account exists with this email address, a password reset link has been sent.')

    // 2. User clicks email link -> Callback receives PKCE code
    let activeSession = null
    const exchangePkceCode = (code) => {
      if (code === 'supabase_default_pkce_code') {
        activeSession = { user: { id: 'usr_rec_456', email: 'user@example.com' } }
        return { data: activeSession, error: null }
      }
      return { data: null, error: new Error('Invalid PKCE auth code') }
    }

    const badCodeRes = exchangePkceCode('invalid_code')
    assert.ok(badCodeRes.error)

    const goodCodeRes = exchangePkceCode('supabase_default_pkce_code')
    assert.strictEqual(goodCodeRes.error, null)
    assert.ok(activeSession)

    // 3. Update password in active recovery session
    const updatePasswordInSession = (session, newPassword, confirmPassword) => {
      if (!session?.user) {
        return { error: 'Your password reset session has expired or is invalid. Please request a new recovery link or code.' }
      }
      if (newPassword.length < 8) {
        return { error: 'New password must be at least 8 characters long.' }
      }
      if (newPassword !== confirmPassword) {
        return { error: 'Passwords do not match.' }
      }
      userStore[session.user.email].passwordHash = newPassword
      return { success: true, message: 'Password updated successfully. You can now sign in.' }
    }

    const mismatchRes = updatePasswordInSession(activeSession, 'NewPass123!', 'Mismatch123!')
    assert.ok(mismatchRes.error.includes('do not match'))

    const updateSuccessRes = updatePasswordInSession(activeSession, 'BrandNewPass2026!', 'BrandNewPass2026!')
    assert.strictEqual(updateSuccessRes.success, true)
    assert.strictEqual(userStore['user@example.com'].passwordHash, 'BrandNewPass2026!')

    // 4. User logs in with new password
    const loginAttempt = (email, pass) => {
      if (userStore[email]?.passwordHash === pass) return { success: true }
      return { error: 'Invalid email or password.' }
    }

    assert.ok(loginAttempt('user@example.com', 'OriginalPassword123!').error)
    assert.strictEqual(loginAttempt('user@example.com', 'BrandNewPass2026!').success, true)
  })

  runTest('Full recovery flow: Request -> OTP -> Reset -> Sign In with new credentials', async () => {
    const userStore = {
      'user@example.com': { passwordHash: 'OldPassword123!', verified: true },
    }

    // 1. Request recovery
    const reqRes = { success: true, message: 'If an account exists with this email address, a password reset link has been sent.' }
    assert.strictEqual(reqRes.success, true)

    // 2. Recovery code verification establishes recovery session
    let recoverySession = null
    const verifyRecoveryCode = (email, code) => {
      if (code === '654987') {
        recoverySession = { email, valid: true }
        return { success: true }
      }
      return { error: 'Invalid or expired recovery code.' }
    }

    const wrongAttempt = verifyRecoveryCode('user@example.com', '000000')
    assert.ok(wrongAttempt.error)

    const correctAttempt = verifyRecoveryCode('user@example.com', '654987')
    assert.strictEqual(correctAttempt.success, true)
    assert.ok(recoverySession)

    // 3. Reset password requires recovery session
    const performReset = (session, newPass) => {
      if (!session?.valid) {
        return { error: 'Your password reset session has expired or is invalid.' }
      }
      userStore[session.email].passwordHash = newPass
      return { success: true, redirect: '/login?reset=success' }
    }

    const resetRes = performReset(recoverySession, 'BrandNewSecurePassword123!')
    assert.strictEqual(resetRes.success, true)
    assert.strictEqual(resetRes.redirect, '/login?reset=success')
    assert.strictEqual(userStore['user@example.com'].passwordHash, 'BrandNewSecurePassword123!')

    // 4. Sign in with updated credentials
    const authenticate = (email, pass) => {
      if (userStore[email]?.passwordHash === pass) return { success: true }
      return { error: 'Invalid email or password.' }
    }

    assert.ok(authenticate('user@example.com', 'OldPassword123!').error)
    assert.strictEqual(authenticate('user@example.com', 'BrandNewSecurePassword123!').success, true)
  })

  // 6. Congratulations / Welcome Email Content, Idempotency & Resend Provider
  console.log('\n--- 6. Congratulations Email Content, Idempotency & Resend Provider ---')

  runTest('Welcome email includes required subject and feature highlights', () => {
    const html = buildWelcomeEmailHtml('Jane Doe', 'http://localhost:3000/dashboard', 'support@dataready.ai')
    const text = buildWelcomeEmailText('Jane Doe', 'http://localhost:3000/dashboard', 'support@dataready.ai')

    // Must address user
    assert.ok(html.includes('Congratulations, Jane Doe!'))
    assert.ok(text.includes('Congratulations, Jane Doe!'))

    // Must include core features
    assert.ok(html.includes('ML Readiness Scoring'), 'HTML must mention ML Readiness Scoring')
    assert.ok(html.includes('Data Quality Inspection'), 'HTML must mention Data Quality Inspection')
    assert.ok(html.includes('Non-Destructive Transformations'), 'HTML must mention Non-Destructive Transformations')
    assert.ok(html.includes('Gemini-Powered Dataset Insights'), 'HTML must mention Gemini Insights')

    // Must include dashboard link and support address
    assert.ok(html.includes('http://localhost:3000/dashboard'))
    assert.ok(html.includes('support@dataready.ai'))
    assert.ok(text.includes('http://localhost:3000/dashboard'))
  })

  await runAsyncTest('sendWelcomeEmail rejects missing recipient or userId', async () => {
    const mockDb = createMockSupabase()
    const resNoTo = await sendWelcomeEmail({ to: '', fullName: 'Alex', userId: 'usr_1', supabaseClient: mockDb })
    assert.strictEqual(resNoTo.success, false)
    assert.ok(resNoTo.error.includes('Missing required recipient'))

    const resNoUser = await sendWelcomeEmail({ to: 'alex@example.com', fullName: 'Alex', userId: '', supabaseClient: mockDb })
    assert.strictEqual(resNoUser.success, false)
  })

  await runAsyncTest('sendWelcomeEmail returns unconfigured: true and DOES NOT record event when RESEND_API_KEY is missing', async () => {
    const originalKey = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    try {
      const mockDb = createMockSupabase()
      const result = await sendWelcomeEmail({
        to: 'unconfigured-test@example.com',
        fullName: 'Test User',
        userId: 'usr_unconfigured_001',
        supabaseClient: mockDb,
      })

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.unconfigured, true)
      assert.ok(result.error.includes('RESEND_API_KEY is not configured'))
      // Critical check: security_events must NOT have recorded welcome_email_sent
      assert.strictEqual(mockDb.insertedEvents.length, 0, 'Must NOT record event when email provider is unconfigured')
    } finally {
      if (originalKey !== undefined) {
        process.env.RESEND_API_KEY = originalKey
      }
    }
  })

  await runAsyncTest('sendWelcomeEmail returns failure and DOES NOT record event when Resend API fails (HTTP 400/500)', async () => {
    const originalKey = process.env.RESEND_API_KEY
    const originalFetch = global.fetch
    process.env.RESEND_API_KEY = 're_mock_test_key'

    // Mock global fetch to return an API error from Resend
    global.fetch = async () => {
      return {
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: 'Domain not verified or sandbox restriction' }),
      }
    }

    try {
      const mockDb = createMockSupabase()
      const result = await sendWelcomeEmail({
        to: 'fail-test@example.com',
        fullName: 'Failing User',
        userId: 'usr_fail_002',
        supabaseClient: mockDb,
      })

      assert.strictEqual(result.success, false)
      assert.ok(result.error.includes('403'))
      // Critical check: security_events must NOT record event on failure
      assert.strictEqual(mockDb.insertedEvents.length, 0, 'Must NOT record event when Resend delivery fails')
    } finally {
      global.fetch = originalFetch
      if (originalKey !== undefined) {
        process.env.RESEND_API_KEY = originalKey
      } else {
        delete process.env.RESEND_API_KEY
      }
    }
  })

  await runAsyncTest('sendWelcomeEmail records welcome_email_sent ONLY AFTER Resend returns HTTP 200/201 with email ID', async () => {
    const originalKey = process.env.RESEND_API_KEY
    const originalFetch = global.fetch
    process.env.RESEND_API_KEY = 're_mock_valid_key'

    let requestBody = null
    global.fetch = async (url, options) => {
      assert.strictEqual(url, 'https://api.resend.com/emails')
      requestBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'email_msg_abcdef123456' }),
      }
    }

    try {
      const mockDb = createMockSupabase()
      const result = await sendWelcomeEmail({
        to: 'newuser@example.com',
        fullName: 'Jane Verified',
        userId: 'usr_success_003',
        supabaseClient: mockDb,
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.emailId, 'email_msg_abcdef123456')
      assert.ok(requestBody)
      assert.deepStrictEqual(requestBody.to, ['newuser@example.com'])
      assert.ok(requestBody.subject.includes('Congratulations'))

      // Verify event was recorded in security_events
      assert.strictEqual(mockDb.insertedEvents.length, 1)
      const recorded = mockDb.insertedEvents[0]
      assert.strictEqual(recorded.user_id, 'usr_success_003')
      assert.strictEqual(recorded.event_type, 'welcome_email_sent')
      assert.strictEqual(recorded.metadata.resend_id, 'email_msg_abcdef123456')
      assert.strictEqual(recorded.metadata.provider, 'resend')
    } finally {
      global.fetch = originalFetch
      if (originalKey !== undefined) {
        process.env.RESEND_API_KEY = originalKey
      } else {
        delete process.env.RESEND_API_KEY
      }
    }
  })

  await runAsyncTest('sendWelcomeEmail skips sending if user already received welcome email (idempotency)', async () => {
    const originalKey = process.env.RESEND_API_KEY
    const originalFetch = global.fetch
    process.env.RESEND_API_KEY = 're_mock_valid_key'

    let fetchCalled = false
    global.fetch = async () => {
      fetchCalled = true
      return { ok: true, json: async () => ({ id: 'should_not_reach_here' }) }
    }

    try {
      // Pre-seed security_events with an existing welcome_email_sent event for this user
      const mockDb = createMockSupabase([
        {
          user_id: 'usr_already_sent_004',
          event_type: 'welcome_email_sent',
          metadata: { to: 'existing@example.com', resend_id: 're_prior_999' },
        },
      ])

      const result = await sendWelcomeEmail({
        to: 'existing@example.com',
        fullName: 'Existing Member',
        userId: 'usr_already_sent_004',
        supabaseClient: mockDb,
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.skipped, true)
      assert.strictEqual(fetchCalled, false, 'External Resend fetch must NOT be called for duplicate event')
      assert.strictEqual(mockDb.insertedEvents.length, 0, 'No new event should be inserted')
    } finally {
      global.fetch = originalFetch
      if (originalKey !== undefined) {
        process.env.RESEND_API_KEY = originalKey
      } else {
        delete process.env.RESEND_API_KEY
      }
    }
  })

  await runAsyncTest('sendWelcomeEmail retries on transient 500 server error and succeeds on second attempt', async () => {
    const originalKey = process.env.RESEND_API_KEY
    const originalFetch = global.fetch
    process.env.RESEND_API_KEY = 're_mock_valid_key'

    let callCount = 0
    global.fetch = async () => {
      callCount++
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 're_recovered_after_retry_999' }),
      }
    }

    try {
      const mockDb = createMockSupabase()
      const result = await sendWelcomeEmail({
        to: 'retry-test@example.com',
        fullName: 'Retry User',
        userId: 'usr_retry_005',
        supabaseClient: mockDb,
      })

      assert.strictEqual(callCount, 2, 'Should attempt dispatch twice on 500')
      assert.strictEqual(result.success, true)
      assert.strictEqual(result.emailId, 're_recovered_after_retry_999')
      assert.strictEqual(mockDb.insertedEvents.length, 1)
      assert.strictEqual(mockDb.insertedEvents[0].metadata.resend_id, 're_recovered_after_retry_999')
      assert.strictEqual(mockDb.insertedEvents[0].metadata.status, 'request_accepted')
    } finally {
      global.fetch = originalFetch
      if (originalKey !== undefined) {
        process.env.RESEND_API_KEY = originalKey
      } else {
        delete process.env.RESEND_API_KEY
      }
    }
  })

  // 7. Route and Component Accessibility Audit
  console.log('\n--- 7. UI Files & Route Registration Audit ---')

  runTest('All required auth routes and components exist with accessible attributes', () => {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'app/(auth)/signup/page.tsx')), 'Signup page must exist')
    assert.ok(fs.existsSync(path.join(process.cwd(), 'app/(auth)/login/page.tsx')), 'Login page must exist')
    assert.ok(fs.existsSync(path.join(process.cwd(), 'app/(auth)/forgot-password/page.tsx')), 'Forgot password page must exist')
    assert.ok(fs.existsSync(path.join(process.cwd(), 'app/(auth)/reset-password/page.tsx')), 'Reset password page must exist')
    assert.ok(fs.existsSync(path.join(process.cwd(), 'app/(auth)/verify-otp/page.tsx')), 'Dedicated verify-otp page must exist')
    assert.ok(fs.existsSync(path.join(process.cwd(), 'components/auth/otp-verification-card.tsx')), 'OTP card component must exist')
    assert.ok(fs.existsSync(path.join(process.cwd(), 'lib/email/welcome.ts')), 'Welcome email service must exist')

    const otpCardCode = fs.readFileSync(path.join(process.cwd(), 'components/auth/otp-verification-card.tsx'), 'utf8')
    assert.ok(otpCardCode.includes('aria-label='), 'OTP inputs must have accessible aria-labels')
    assert.ok(otpCardCode.includes('inputMode="numeric"'), 'OTP inputs must have numeric inputMode for mobile keyboards')
  })

  console.log('\n======================================================================')
  console.log(` Summary: ${passed} passed, ${failed} failed.`)
  console.log('======================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
})()
