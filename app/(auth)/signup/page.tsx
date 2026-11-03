'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { signup } from '@/app/(auth)/actions'
import { Loader2, Database, Eye, EyeOff, Check, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { OtpVerificationCard } from '@/components/auth/otp-verification-card'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form field states for validation and OTP continuation
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // State for switching to OTP verification screen
  const [pendingVerification, setPendingVerification] = useState(false)

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
      setError('Password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('fullName', fullName)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('confirmPassword', confirmPassword)

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    if (result?.sessionEstablished) {
      // Immediate session established (no OTP required by project setting)
      router.push('/dashboard')
      return
    }

    if (result?.requiresOtp) {
      // Transition to OTP screen
      setPendingVerification(true)
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

      {pendingVerification ? (
        <OtpVerificationCard
          email={email}
          fullName={fullName}
          type="signup"
          onChangeEmail={() => setPendingVerification(false)}
          onSuccess={() => router.push('/dashboard')}
        />
      ) : (
        <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Create an account</CardTitle>
            <CardDescription className="text-xs">
              Enter your details below to start analyzing and preparing your datasets.
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
                <Label htmlFor="fullName" className="text-xs font-semibold">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="h-10 text-sm rounded-xl"
                  disabled={isLoading}
                />
              </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
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
                    disabled={isLoading}
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
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm Password</Label>
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
                    disabled={isLoading}
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
                className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-sm font-semibold transition-all text-sm rounded-xl" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>

              <div className="relative w-full flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/80" />
                </div>
                <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Or continue with
                </span>
              </div>

              <GoogleSignInButton label="Sign up with Google" redirectTo="/dashboard" />

              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-indigo-600 font-semibold hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}
