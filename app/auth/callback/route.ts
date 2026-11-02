import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/welcome'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const authError = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const rawNext = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Validate next redirect parameter to prevent open redirect attacks
  const safeNext = (rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\'))
    ? rawNext
    : '/dashboard'

  // Handle provider-level error redirects (e.g. expired link)
  if (authError || errorDescription) {
    console.warn('Auth callback received error from provider:', authError, errorDescription)
    const fallbackBase = safeNext.includes('reset-password') ? '/forgot-password' : '/login'
    const errorParam = encodeURIComponent(errorDescription || authError || 'Authentication error')
    return NextResponse.redirect(new URL(`${fallbackBase}?error=${errorParam}`, requestUrl.origin))
  }

  const supabase = await createClient()

  // 1. PKCE Code Exchange
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      return await handleAuthSuccess(supabase, data.user, safeNext, requestUrl.origin)
    }
    console.error('Code exchange failed:', error?.message)
  }

  // 2. Token Hash Verification (e.g. recovery or confirmation token_hash from email links)
  if (token_hash) {
    const effectiveType: EmailOtpType = type || (safeNext.includes('reset-password') ? 'recovery' : 'email')
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: effectiveType,
    })
    if (!error && data.user) {
      return await handleAuthSuccess(supabase, data.user, safeNext, requestUrl.origin)
    }
    console.error('Token hash verification failed:', error?.message)
  }

  // Fallback if neither code nor token_hash succeeded
  const fallbackTarget = safeNext.includes('reset-password')
    ? '/forgot-password?error=InvalidOrExpiredRecoveryLink'
    : '/login?error=AuthCallbackFailed'
  return NextResponse.redirect(new URL(fallbackTarget, requestUrl.origin))
}

async function handleAuthSuccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  nextUrl: string,
  origin: string
) {
  // Idempotently ensure profile exists
  try {
    const fullName = (user.user_metadata?.full_name as string) || 'Member'
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })

    // If not a password reset flow, send welcome email idempotently
    if (!nextUrl.includes('reset-password') && user.email) {
      await sendWelcomeEmail({
        to: user.email,
        fullName,
        userId: user.id,
      })
    }
  } catch (profileErr) {
    console.warn('Auth callback profile/welcome sync warning:', profileErr)
  }

  return NextResponse.redirect(new URL(nextUrl, origin))
}

