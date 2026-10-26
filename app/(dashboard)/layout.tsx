import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense fallback={<div className="w-64 border-r border-border/80 bg-sidebar h-full" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-indigo-50/20 via-background to-background dark:from-indigo-950/10 dark:via-background dark:to-background">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
