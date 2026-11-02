'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { verifyEmailOtp, verifyRecoveryOtp, resendOtp } from '@/app/(auth)/actions'
import { useRouter } from 'next/navigation'

interface OtpVerificationCardProps {
  email: string
  fullName?: string
  type?: 'signup' | 'recovery'
  onSuccess?: () => void
  onChangeEmail?: () => void
  redirectTo?: string
}

export function OtpVerificationCard({
  email,
  fullName,
  type = 'signup',
  onSuccess,
  onChangeEmail,
  redirectTo = '/dashboard',
}: OtpVerificationCardProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [attempts, setAttempts] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleDigitChange = (index: number, value: string) => {
    setError(null)

    // Only allow numbers
    const cleanVal = value.replace(/\D/g, '')
    if (!cleanVal && value !== '') return

    const newDigits = [...digits]

    if (cleanVal.length > 1) {
      // Handle paste or auto-fill in single box
      const pastedChars = cleanVal.slice(0, 6).split('')
      pastedChars.forEach((char, i) => {
        if (index + i < 6) {
          newDigits[index + i] = char
        }
      })
      setDigits(newDigits)
      const nextIndex = Math.min(index + pastedChars.length, 5)
      inputRefs.current[nextIndex]?.focus()

      // If all 6 filled, trigger verification
      if (newDigits.every((d) => d.length === 1)) {
        submitOtp(newDigits.join(''))
      }
      return
    }

    newDigits[index] = cleanVal
    setDigits(newDigits)

    // Auto-advance to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (cleanVal && index === 5 && newDigits.every((d) => d.length === 1)) {
      submitOtp(newDigits.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        setDigits(newDigits)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    setError(null)
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasteData) return

    const newDigits = [...digits]
    pasteData.split('').forEach((char, idx) => {
      newDigits[idx] = char
    })
    setDigits(newDigits)

    const focusIdx = Math.min(pasteData.length, 5)
    inputRefs.current[focusIdx]?.focus()

    if (pasteData.length === 6) {
      submitOtp(pasteData)
    }
  }

  const submitOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('')
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.')
      return
    }

    if (attempts >= 5) {
      setError('Too many failed attempts. Please request a new verification code.')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      if (type === 'recovery') {
        const res = await verifyRecoveryOtp(email, code)
        if (res.error) {
          setAttempts((prev) => prev + 1)
          setError(res.error)
          setIsVerifying(false)
        } else {
          setSuccess('Code verified! Proceeding to set a new password...')
          setTimeout(() => {
            if (onSuccess) onSuccess()
            else router.push('/reset-password')
          }, 1000)
        }
      } else {
        const res = await verifyEmailOtp(email, code, fullName)
        if (res.error) {
          setAttempts((prev) => prev + 1)
          setError(res.error)
          setIsVerifying(false)
        } else {
          setSuccess('Email verified! Redirecting to your dashboard...')
          setTimeout(() => {
            if (onSuccess) onSuccess()
            else router.push(redirectTo)
          }, 1200)
        }
      }
    } catch (err) {
      console.error('OTP submission error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || isResending) return

    setIsResending(true)
    setError(null)

    try {
      const res = await resendOtp(email, type)
      if (res.error) {
        setError(res.error)
      } else {
        setCountdown(60)
        setAttempts(0)
        setDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
          <Mail className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          {type === 'recovery' ? 'Enter Recovery Code' : 'Verify Your Email'}
        </CardTitle>
        <CardDescription className="text-xs">
          We sent a 6-digit verification code to <br />
          <span className="font-semibold text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <Alert variant="destructive" className="rounded-xl border-rose-200 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/40 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <AlertDescription className="text-rose-700 dark:text-rose-300 font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="rounded-xl border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-300 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* 6-Digit OTP Box Grid */}
        <div className="flex justify-center gap-2 sm:gap-3 py-2">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={isVerifying || !!success}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${idx + 1} of verification code`}
              className={`h-12 w-11 sm:h-13 sm:w-12 rounded-xl text-center text-xl font-bold transition-all border outline-none
                ${
                  digit
                    ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/40 text-foreground'
                    : 'border-border/80 bg-background/80 text-foreground focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }
                ${isVerifying ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            />
          ))}
        </div>

        <Button
          onClick={() => submitOtp()}
          disabled={isVerifying || digits.some((d) => !d) || !!success}
          className="w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white font-semibold shadow-sm transition-all text-sm rounded-xl"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying Code...
            </>
          ) : (
            'Verify & Continue'
          )}
        </Button>

        {/* Resend Cooldown & Action */}
        <div className="text-center text-xs space-y-2">
          <p className="text-muted-foreground">
            Didn&apos;t receive the code?{' '}
            {countdown > 0 ? (
              <span className="font-semibold text-foreground">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-semibold text-blue-600 hover:text-indigo-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                {isResending ? <RefreshCw className="h-3 w-3 animate-spin inline" /> : null}
                Resend Code
              </button>
            )}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2 pt-0 pb-6 border-t border-border/50">
        {onChangeEmail && (
          <button
            type="button"
            onClick={onChangeEmail}
            className="text-xs text-muted-foreground hover:text-foreground font-medium inline-flex items-center justify-center gap-1.5 transition-colors pt-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Entered wrong email? Change email
          </button>
        )}
      </CardFooter>
    </Card>
  )
}
