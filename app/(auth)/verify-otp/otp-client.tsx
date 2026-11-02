'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OtpVerificationCard } from '@/components/auth/otp-verification-card'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

interface OtpVerificationClientProps {
  initialEmail: string
  type: 'signup' | 'recovery'
  initialFullName?: string
}

export function OtpVerificationClient({
  initialEmail,
  type,
  initialFullName,
}: OtpVerificationClientProps) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [hasConfirmedEmail, setHasConfirmedEmail] = useState(Boolean(initialEmail && initialEmail.includes('@')))

  if (!hasConfirmedEmail) {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-indigo-500/5 bg-card/95 backdrop-blur-xs rounded-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Enter Your Email
          </CardTitle>
          <CardDescription className="text-xs">
            Enter the email address associated with your account to verify your 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp-email" className="text-xs font-semibold">Email address</Label>
            <Input
              id="otp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="h-10 text-sm rounded-xl"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => {
              if (email && email.includes('@')) {
                setHasConfirmedEmail(true)
              }
            }}
            disabled={!email || !email.includes('@')}
            className="w-full h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold shadow-sm transition-all text-sm rounded-xl"
          >
            Continue to Verification
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <OtpVerificationCard
      email={email}
      fullName={initialFullName}
      type={type}
      onChangeEmail={() => setHasConfirmedEmail(false)}
      onSuccess={() => {
        if (type === 'recovery') {
          router.push('/reset-password')
        } else {
          router.push('/dashboard')
        }
      }}
    />
  )
}
