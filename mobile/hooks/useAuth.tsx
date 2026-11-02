import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../lib/supabase'
import { getSupabaseConfigError } from '../lib/config'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithGoogle: () => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; requiresOtp?: boolean }>
  signOut: () => Promise<{ error?: string }>
  forgotPassword: (email: string) => Promise<{ error?: string }>
  verifyOtp: (email: string, token: string, type?: 'signup' | 'recovery' | 'email') => Promise<{ error?: string }>
  resetPassword: (newPassword: string) => Promise<{ error?: string }>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function formatAuthError(errMessage: string): string {
  const lower = errMessage.toLowerCase()
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('unknownhostexception') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused')
  ) {
    return 'Unable to connect to the authentication server. Please check your internet connection.'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Email not confirmed. Please check your email for the verification code.'
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Please sign in.'
  }
  return errMessage
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // 1. Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })

    // 2. Listen to ongoing auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const refreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
    } catch {
      // Ignore
    }
  }

  const signIn = async (email: string, password: string) => {
    const configError = getSupabaseConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: formatAuthError(error.message) }
      }
      setSession(data.session)
      setUser(data.user)
      return {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      return { error: formatAuthError(msg) }
    }
  }

  const signInWithGoogle = async () => {
    const configError = getSupabaseConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const redirectUrl = Linking.createURL('auth/callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        return { error: formatAuthError(error.message) }
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success' && result.url) {
          await refreshSession()
          return {}
        }
      }
      return {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed'
      return { error: formatAuthError(msg) }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const configError = getSupabaseConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
        },
      })

      if (error) {
        return { error: formatAuthError(error.message) }
      }

      setSession(data.session)
      setUser(data.user)

      // If user is returned without session, Supabase requires email OTP or confirmation
      const requiresOtp = !data.session && !!data.user
      return { requiresOtp }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed'
      return { error: formatAuthError(msg) }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { error: error.message }
      }
      setSession(null)
      setUser(null)
      return {}
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Logout failed' }
    }
  }

  const forgotPassword = async (email: string) => {
    const configError = getSupabaseConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'dataready://reset-password',
      })
      if (error) {
        return { error: formatAuthError(error.message) }
      }
      return {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset request failed'
      return { error: formatAuthError(msg) }
    }
  }

  const verifyOtp = async (email: string, token: string, type: 'signup' | 'recovery' | 'email' = 'signup') => {
    const configError = getSupabaseConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type,
      })

      if (error) {
        return { error: formatAuthError(error.message) }
      }

      setSession(data.session)
      setUser(data.user)
      return {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OTP verification failed'
      return { error: formatAuthError(msg) }
    }
  }

  const resetPassword = async (newPassword: string) => {
    const configError = getSupabaseConfigError()
    if (configError) {
      return { error: configError }
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return { error: formatAuthError(error.message) }
      }

      setUser(data.user)
      return {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password update failed'
      return { error: formatAuthError(msg) }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        forgotPassword,
        verifyOtp,
        resetPassword,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
