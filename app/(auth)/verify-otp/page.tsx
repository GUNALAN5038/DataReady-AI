import React, { Suspense } from 'react'
import Link from 'next/link'
import { Database } from 'lucide-react'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { OtpVerificationClient } from './otp-client'

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const rawEmail = typeof resolvedParams.email === 'string' ? resolvedParams.email : ''
  const rawType = resolvedParams.type === 'recovery' ? 'recovery' : 'signup'
  const rawName = typeof resolvedParams.name === 'string' ? resolvedParams.name : undefined

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

      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-2xl bg-card animate-pulse" />}>
        <OtpVerificationClient
          initialEmail={rawEmail}
          type={rawType}
          initialFullName={rawName}
        />
      </Suspense>

      <div className="text-center text-xs text-muted-foreground mt-6">
        Already verified?{' '}
        <Link href="/login" className="text-blue-600 hover:text-indigo-600 font-semibold hover:underline">
          Return to sign in
        </Link>
      </div>
    </div>
  )
}
