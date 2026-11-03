'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { resetPasswordForEmail, resendOtp } from '@/app/(auth)/actions'
import { Loader2, Database, ArrowLeft, KeyRound, MailCheck, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { OtpVerificationCard } from '@/components/auth/otp-verification-card'

function ForgotPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(() => {
    if (!urlError) return null
    if (urlError === 'InvalidOrExpiredRecoveryLink' || urlError === 'RecoverySessionExpired') {
      return 'The password recovery link or session has expired. Please enter your email below to receive a new reset link.'
    }
    return decodeURIComponent(urlError)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showOtpFallback, setShowOtpFallback] = useState(false)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResendSuccess(null)

    const formData = new FormData()
    formData.append('email', email)

    const result = await resetPasswordForEmail(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    // Supabase default service sends a confirmation/reset link
    setEmailSent(true)
    setResendCooldown(60)
    setIsLoading(false)
  }

  async function handleResend() {
    if (resendCooldown > 0 || isLoading || !email) return
    setIsLoading(true)
    setError(null)
    setResendSuccess(null)

    const result = await resendOtp(email, 'recovery')

    if (result?.error) {
      setError(result.error)
    } else {
      setResendSuccess(result.message || 'A new password reset link has been sent to your email.')
      setResendCooldown(60)
    }
    setIsLoading(false)
  }

  // If user opts to manually enter a 6-digit recovery code
  if (emailSent && showOtpFallback) {
    return (
      <div className="w-full max-w-md space-y-3">
        <OtpVerificationCard
          email={email}
          type="recovery"
          onChangeEmail={() => {
            setShowOtpFallback(false)
            setEmailSent(false)
          }}
          onSuccess={() => router.push('/reset-password')}
        />
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowOtpFallback(false)}
            className="text-xs text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to email link instructions
          </button>
        </div>
      </div>
    )
  }

  // Confirmation state: Email sent with reset link instructions
  if (emailSent) {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Check your email</CardTitle>
          <CardDescription className="text-xs">
            We sent a password reset link to <br />
            <span className="font-semibold text-foreground break-all">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {resendSuccess && (
            <Alert className="rounded-xl border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-emerald-700 dark:text-emerald-300 font-medium">
                {resendSuccess}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="rounded-xl border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-xs">
              <AlertDescription className="text-rose-700 dark:text-rose-300 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Next steps:</p>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>Open the reset email from DataReady AI.</li>
              <li>Click the <strong>Reset password</strong> button or link inside.</li>
              <li>You will be directed securely back to choose a new password.</li>
            </ol>
            <p className="pt-1 text-[11px] text-muted-foreground/80">
              The link is valid for 1 hour. If you don&apos;t see it, check your spam or junk folder.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
              className="w-full h-10 text-xs font-semibold rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Sending link...
                </>
              ) : resendCooldown > 0 ? (
                `Resend link in ${resendCooldown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Resend Reset Link
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false)
                setError(null)
                setResendSuccess(null)
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground font-medium py-1 transition-colors"
            >
              Use a different email address
            </button>
          </div>

          {/* Fallback option for users with recovery code */}
          <div className="pt-2 border-t border-border/60 text-center">
            <button
              type="button"
              onClick={() => setShowOtpFallback(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              Have a 6-digit recovery code instead?
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
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
    )
  }

  // Initial Request Form
  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Forgot Password</CardTitle>
        <CardDescription className="text-xs">
          Enter your email address to receive a secure password recovery link.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-xs">
              <AlertDescription className="text-rose-700 dark:text-rose-300 font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="h-10 text-sm rounded-xl"
              disabled={isLoading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button 
            type="submit" 
            className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm font-semibold transition-all text-sm rounded-xl" 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link href="/login" className="text-blue-600 hover:text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function ForgotPasswordPage() {
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

      <Suspense fallback={<div className="w-full max-w-md h-80 rounded-2xl bg-card animate-pulse" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}
