'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { resetPasswordForEmail } from '@/app/(auth)/actions'
import { Loader2, Database } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    const result = await resetPasswordForEmail(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(result.success)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50/50 via-background to-blue-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20 p-4">
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

      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Forgot Password</CardTitle>
          <CardDescription className="text-xs">
            Enter your email address and we will send you a secure password reset link.
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <Alert className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
                <AlertDescription className="text-xs font-medium">{success}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="name@example.com" required className="h-10 text-sm" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button 
              type="submit" 
              className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm font-semibold transition-all text-sm" 
              disabled={isLoading || !!success}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Password Reset Link
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="text-blue-600 hover:text-indigo-600 font-semibold hover:underline">
                Back to sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
