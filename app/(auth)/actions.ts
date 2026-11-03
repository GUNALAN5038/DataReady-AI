'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { sendWelcomeEmail } from '@/lib/email/welcome'

/**
 * Sanitizes an internal redirect path to prevent open redirect vulnerabilities.
 */
function sanitizeRedirectUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '/dashboard'
  const trimmed = url.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed
  }
  return '/dashboard'
}

/**
 * Signs in a user using email and password.
 * Distinguishes unverified email accounts so the user can immediately enter their OTP.
 */
export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const rawRedirect = formData.get('redirectUrl') as string | null
  const safeRedirect = sanitizeRedirectUrl(rawRedirect)

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed')) {
        return {
          error: 'Your email is not verified yet. Please enter the verification code sent to your email.',
          unverified: true,
          email,
        }
      }
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        return { error: 'Invalid email or password. Please verify your credentials and try again.' }
      }
      return { error: error.message }
    }

    if (!data.user) {
      return { error: 'Authentication failed. Please try again.' }
    }

    revalidatePath('/', 'layout')
    return { success: true, redirectTo: safeRedirect }
  } catch (err: unknown) {
    console.error('Sign in exception:', err)
    return { error: `Sign in error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Registers a new user. If Supabase requires email verification, prompts for OTP code.
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim()
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !password || !fullName || !confirmPassword) {
    return { error: 'All fields are required.' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address.' }
  }

  // Validate password strength
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const origin = (await headers()).get('origin')

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit')) {
        return { error: 'Signup rate limit exceeded. Please wait a few moments before trying again.' }
      }
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { error: 'An account with this email is already registered. Please sign in instead.' }
      }
      if (msg.includes('password')) {
        return { error: `Password requirement: ${error.message}` }
      }
      return { error: error.message }
    }

    // Check if session was granted immediately (e.g. if email confirmation is turned off in Supabase)
    if (data.session && data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
      } catch (profileErr) {
        console.warn('Profile upsert warning:', profileErr)
      }

      await sendWelcomeEmail({
        to: email,
        fullName,
        userId: data.user.id,
      })

      revalidatePath('/', 'layout')
      return {
        success: true,
        sessionEstablished: true,
        message: 'Account created and verified successfully.',
      }
    }

    // Standard OTP flow: user is created, waiting for OTP code verification
    return {
      success: true,
      requiresOtp: true,
      email,
      fullName,
      message: 'Verification code sent to your email.',
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('Signup exception:', err)
    if (errMsg.toLowerCase().includes('fetch failed') || errMsg.toLowerCase().includes('network')) {
      return { error: 'Network failure connecting to authentication provider. Please try again.' }
    }
    return { error: `Signup error: ${errMsg}` }
  }
}

/**
 * Verifies an email OTP code (for signup or email verification).
 * Establishes the authenticated session, creates the profile, and dispatches the welcome email.
 */
export async function verifyEmailOtp(email: string, token: string, fullName?: string) {
  const supabase = await createClient()

  if (!email || !token) {
    return { error: 'Email and verification code are required.' }
  }

  const cleanToken = token.trim().replace(/\s+/g, '')
  if (cleanToken.length < 6) {
    return { error: 'Please enter the complete 6-digit verification code.' }
  }

  try {
    // Attempt standard signup token verification
    let { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: cleanToken,
      type: 'signup',
    })

    // If 'signup' fails, fallback to 'email' token verification
    if (error && (error.message.toLowerCase().includes('type') || error.message.toLowerCase().includes('invalid'))) {
      const emailAttempt = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanToken,
        type: 'email',
      })
      if (!emailAttempt.error) {
        data = emailAttempt.data
        error = null
      }
    }

    if (error || !data.user) {
      return {
        error: error?.message || 'Invalid or expired verification code. Please check your code or request a new one.',
      }
    }

    const verifiedUser = data.user
    const resolvedName = fullName || verifiedUser.user_metadata?.full_name || 'Member'

    // Idempotent profile creation/update
    try {
      await supabase.from('profiles').upsert({
        id: verifiedUser.id,
        full_name: resolvedName,
        updated_at: new Date().toISOString(),
      })
    } catch (profileErr) {
      console.warn('Profile sync warning on OTP verify:', profileErr)
    }

    // Send the congratulations/welcome email
    await sendWelcomeEmail({
      to: email,
      fullName: resolvedName,
      userId: verifiedUser.id,
    })

    revalidatePath('/', 'layout')
    return {
      success: true,
      message: 'Email verified successfully! Welcome to DataReady AI.',
    }
  } catch (err: unknown) {
    console.error('Verify OTP exception:', err)
    return { error: `Verification error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Resends an OTP verification code.
 */
/**
 * Derives the application origin safely from trusted request headers and configuration.
 */
async function getSafeAppOrigin(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const proto = headersList.get('x-forwarded-proto') || 'http'
  const origin = headersList.get('origin') || (host ? `${proto}://${host}` : null) || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return origin.replace(/\/+$/, '')
}

export async function resendOtp(email: string, type: 'signup' | 'recovery' = 'signup') {
  const supabase = await createClient()

  if (!email) {
    return { error: 'Email is required.' }
  }

  try {
    if (type === 'recovery') {
      const cleanOrigin = await getSafeAppOrigin()
      const redirectTo = `${cleanOrigin}/auth/callback?next=/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      })
      if (error) return { error: error.message }
      return { success: true, message: 'A new password reset link has been sent to your email.' }
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true, message: 'A new verification code has been sent to your email.' }
  } catch (err: unknown) {
    console.error('Resend OTP exception:', err)
    return { error: `Resend error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Requests password reset. Always returns a generic, safe response to prevent email enumeration.
 */
export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email) {
    return { error: 'Email is required.' }
  }

  const cleanOrigin = await getSafeAppOrigin()
  const redirectTo = `${cleanOrigin}/auth/callback?next=/reset-password`

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.warn('Password recovery request warning:', error.message)
      // Check for rate limits specifically
      if (error.message.toLowerCase().includes('rate limit')) {
        return { error: 'Password reset rate limit reached. Please wait a few moments before trying again.' }
      }
    }

    // Generic safe response to prevent user enumeration
    return {
      success: true,
      email,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    }
  } catch (err: unknown) {
    console.error('Password reset exception:', err)
    return {
      success: true,
      email,
      message: 'If an account exists with this email address, a password reset link has been sent.',
    }
  }
}

/**
 * Verifies recovery OTP code and establishes password recovery session.
 */
export async function verifyRecoveryOtp(email: string, token: string) {
  const supabase = await createClient()

  if (!email || !token) {
    return { error: 'Email and recovery code are required.' }
  }

  const cleanToken = token.trim().replace(/\s+/g, '')

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: cleanToken,
      type: 'recovery',
    })

    if (error || !data.user) {
      return {
        error: error?.message || 'Invalid or expired recovery code. Please check your code or request a new one.',
      }
    }

    revalidatePath('/', 'layout')
    return {
      success: true,
      message: 'Recovery code verified. You may now set a new password.',
    }
  } catch (err: unknown) {
    console.error('Verify recovery OTP exception:', err)
    return { error: `Recovery error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Updates user password once a recovery or authenticated session exists.
 */
export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Both password fields are required.' }
  }

  if (password.length < 8) {
    return { error: 'New password must be at least 8 characters long.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  try {
    // Verify an active user session exists
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        error: 'Your password reset session has expired or is invalid. Please request a new recovery link or code.',
      }
    }

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true, message: 'Password updated successfully. You can now sign in.' }
  } catch (err: unknown) {
    console.error('Update password exception:', err)
    return { error: `Password update error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Logs out the user.
 */
export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Logout error:', err)
  }
  redirect('/login')
}
