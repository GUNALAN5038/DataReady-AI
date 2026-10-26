'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  let success = false

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    success = true
  } catch (err: unknown) {
    return { error: `Exception: ${err instanceof Error ? err.message : String(err)}` }
  }

  if (success) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !password || !fullName || !confirmPassword) {
    return { error: 'All fields are required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const origin = (await headers()).get('origin')

  try {
    const { error } = await supabase.auth.signUp({
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
      let friendlyError = error.message
      const msg = error.message.toLowerCase()
      
      if (msg.includes('rate limit')) {
        friendlyError = 'Supabase has temporarily limited confirmation emails. Please wait and try again later, or use an existing account.'
      } else if (msg.includes('already registered') || msg.includes('already exists')) {
        friendlyError = 'An account with this email is already registered. Please log in.'
      } else if (msg.includes('password')) {
        friendlyError = `Password issue: ${error.message}`
      } else if (msg.includes('invalid email') || msg.includes('valid email')) {
        friendlyError = 'Please enter a valid email address.'
      }
      
      return { error: friendlyError }
    }

    return { success: 'Check your email to continue sign in process.' }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.toLowerCase().includes('fetch failed') || errMsg.toLowerCase().includes('network')) {
      return { error: 'Network or server failure connecting to authentication provider. Please try again later.' }
    }
    return { error: `Exception: ${errMsg}` }
  }
}

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const origin = (await headers()).get('origin')

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: origin ? `${origin}/auth/callback?next=/reset-password` : undefined,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: 'Check your email for a password reset link.' }
  } catch (err: unknown) {
    return { error: `Exception: ${err instanceof Error ? err.message : String(err)}` }
  }
}

export async function logout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Logout error:', err)
  }
  redirect('/login')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'Both fields are required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  let success = false
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      return { error: error.message }
    }

    success = true
  } catch (err: unknown) {
    return { error: `Exception: ${err instanceof Error ? err.message : String(err)}` }
  }

  if (success) {
    redirect('/dashboard')
  }
}
