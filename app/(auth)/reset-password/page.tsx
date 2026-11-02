'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { updatePassword } from '@/app/(auth)/actions'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Database, Eye, EyeOff, Check, X, Lock, CheckCircle2, AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThemeToggleCompact } from '@/components/theme-toggle'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Recovery session validation states
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Verify that an active recovery/authenticated session exists
  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    async function checkRecoverySession() {
      try {
        const { data: { user }, error: sessionError } = await supabase.auth.getUser()
        if (!isMounted) return

        if (sessionError || !user) {
          setHasValidSession(false)
        } else {
          setHasValidSession(true)
          setUserEmail(user.email ?? null)
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Session verification error:', err)
          setHasValidSession(false)
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false)
        }
      }
    }

    checkRecoverySession()

    return () => {
      isMounted = false
    }
  }, [])

  // Interactive password strength evaluation
  const passwordCriteria = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password),
    }
  }, [password])

  const strengthScore = useMemo(() => {
    let score = 0
    if (passwordCriteria.hasMinLength) score += 25
    if (passwordCriteria.hasUppercase) score += 25
    if (passwordCriteria.hasLowercase) score += 25
    if (passwordCriteria.hasNumberOrSymbol) score += 25
    return score
  }, [passwordCriteria])

  const strengthLabel = useMemo(() => {
    if (strengthScore <= 25) return { text: 'Weak', color: 'bg-rose-500' }
    if (strengthScore <= 50) return { text: 'Fair', color: 'bg-amber-500' }
    if (strengthScore <= 75) return { text: 'Good', color: 'bg-blue-500' }
    return { text: 'Strong', color: 'bg-emerald-500' }
  }, [strengthScore])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('New password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('password', password)
    formData.append('confirmPassword', confirmPassword)

    const result = await updatePassword(formData)

    if (result?.error) {
      setError(result.error)
      if (result.error.toLowerCase().includes('expired') || result.error.toLowerCase().includes('invalid')) {
        setHasValidSession(false)
      }
      setIsLoading(false)
      return
    }

    if (result?.success) {
      setSuccess('Your password has been updated successfully! Redirecting to sign in...')
      // Sign out to require fresh login with new password
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.warn('Signout warning after password reset:', signOutErr)
      }

      setTimeout(() => {
        router.push('/login?reset=success')
      }, 1500)
    }

    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50/50 via-background to-blue-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggleCompact />
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-3">
          <Database className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-1.5 text-xl font-bold tracking-tight">
          <span className="text-foreground">DataReady</span>
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent font-extrabold">AI</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Automated ML Dataset Quality Platform</p>
      </div>

      {isCheckingSession ? (
        /* Checking recovery session state */
        <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl p-8 text-center space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Verifying recovery session</h3>
            <p className="text-xs text-muted-foreground">Please wait while we validate your security link...</p>
          </div>
        </Card>
      ) : !hasValidSession ? (
        /* Missing or Expired Recovery Session Card */
        <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Recovery Link Expired or Invalid
            </CardTitle>
            <CardDescription className="text-xs">
              To choose a new password, you need an active recovery session from your email link.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 p-3.5 space-y-2 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold">Why am I seeing this?</p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-rose-700 dark:text-rose-400">
                <li>The password reset link has already been used once.</li>
                <li>The link expired (links expire after 1 hour).</li>
                <li>You navigated to this page directly without clicking the link in your email.</li>
              </ul>
            </div>

            <Link
              href="/forgot-password"
              className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm font-semibold transition-all text-sm rounded-xl inline-flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Request New Reset Email
            </Link>
          </CardContent>

          <CardFooter className="pt-0 pb-6 justify-center">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      ) : (
        /* Valid Session: Password Reset Form */
        <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Set New Password</CardTitle>
            <CardDescription className="text-xs">
              {userEmail ? (
                <>Updating password for <strong className="text-foreground">{userEmail}</strong></>
              ) : (
                'Choose a strong password to secure your account.'
              )}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-xs">
                  <AlertDescription className="text-rose-700 dark:text-rose-300 font-medium">
                    <div>{error}</div>
                    {(error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')) && (
                      <div className="mt-2.5">
                        <Link
                          href="/forgot-password"
                          className="inline-block px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors"
                        >
                          Request New Reset Link →
                        </Link>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="rounded-xl border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription className="text-emerald-700 dark:text-emerald-300 font-medium">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 text-sm pr-10 rounded-xl"
                    placeholder="At least 8 characters"
                    disabled={isLoading || !!success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="pt-1.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Strength:</span>
                      <span className="font-semibold text-foreground">{strengthLabel.text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthLabel.color}`}
                        style={{ width: `${strengthScore}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {passwordCriteria.hasMinLength ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/60" />
                        )}
                        <span>8+ characters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {passwordCriteria.hasUppercase ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/60" />
                        )}
                        <span>Uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {passwordCriteria.hasLowercase ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/60" />
                        )}
                        <span>Lowercase letter</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {passwordCriteria.hasNumberOrSymbol ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/60" />
                        )}
                        <span>Number or symbol</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-10 text-sm pr-10 rounded-xl"
                    placeholder="Re-enter password"
                    disabled={isLoading || !!success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button 
                type="submit" 
                className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm font-semibold transition-all text-sm rounded-xl" 
                disabled={isLoading || !!success}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                <Link href="/login" className="text-blue-600 hover:text-indigo-600 font-semibold hover:underline">
                  Back to sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
