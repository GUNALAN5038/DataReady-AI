'use client'

import React from 'react'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { ThemeToggleCompact } from '@/components/theme-toggle'
import { User } from 'lucide-react'
import Link from 'next/link'

export function DashboardHeader({ userEmail }: { userEmail?: string | null }) {
  return (
    <header className="h-16 border-b border-border/70 bg-background/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
          Workspace
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggleCompact />
        <NotificationCenter />
        <Link
          href="/settings?tab=profile"
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground group"
          title={userEmail || 'User Profile'}
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-2xs group-hover:scale-105 transition-transform">
            <User className="h-4 w-4" />
          </div>
          {userEmail && (
            <span className="text-xs font-medium hidden md:inline-block max-w-[150px] truncate">
              {userEmail}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}

