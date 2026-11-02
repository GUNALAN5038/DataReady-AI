'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { login } from '@/app/(auth)/actions'
import { Loader2, Database, Eye, EyeOff, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('next') || searchParams.get('redirectTo') || '/dashboard'
  const isResetSuccess = searchParams.get('reset') === 'success'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUnverified, setIsUnverified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setIsUnverified(false)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('redirectUrl', redirectUrl)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      if (result.unverified) {
        setIsUnverified(true)
      }
      setIsLoading(false)
      return
    }

    if (result?.success) {
      router.push(result.redirectTo || '/dashboard')
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Sign in to your account</CardTitle>
        <CardDescription className="text-xs">
          Enter your email and password to access your dataset workspace.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {isResetSuccess && !error && (
            <Alert className="rounded-xl border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-emerald-700 dark:text-emerald-300 font-medium">
                Password updated successfully. Please sign in with your new password.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert
              variant="destructive"
              className={`rounded-xl text-xs ${
                isUnverified
                  ? 'border-amber-500/50 bg-amber-50/70 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/60'
                  : 'border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              {isUnverified ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div className="space-y-2">
                <AlertDescription className="font-medium">{error}</AlertDescription>
                {isUnverified && (
                  <div>
                    <Link
                      href={`/verify-otp?email=${encodeURIComponent(email)}&type=signup`}
                      className="inline-block px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors"
                    >
                      Enter Verification Code →
                    </Link>
                  </div>
                )}
              </div>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-indigo-600 font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 text-sm pr-10 rounded-xl"
                placeholder="••••••••"
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
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button 
            type="submit" 
            className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm font-semibold transition-all text-sm rounded-xl" 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>

          <div className="relative w-full flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/80" />
            </div>
            <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Or continue with
            </span>
          </div>

          <GoogleSignInButton label="Continue with Google" redirectTo={redirectUrl} />

          <div className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-indigo-600 font-semibold hover:underline">
              Create one now
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>
    </div>
  )
}
