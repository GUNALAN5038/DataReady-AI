'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Database,
  MessageSquare,
  Bell,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  User,
  Shield,
  Key
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/(auth)/actions'
import { ThemeToggleCompact } from '@/components/theme-toggle'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload Dataset', href: '/upload', icon: Upload },
  { name: 'My Datasets', href: '/datasets', icon: Database },
  { name: 'AI Chat', href: '/chat', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
]

const userNavigation = [
  { name: 'Profile', href: '/settings?tab=profile', tab: 'profile', icon: User },
  { name: 'API Keys', href: '/settings?tab=keys', tab: 'keys', icon: Key },
  { name: 'Security', href: '/settings?tab=security', tab: 'security', icon: Shield },
  { name: 'Settings', href: '/settings', tab: undefined, icon: Settings },
]

const supportNavigation = [
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'About', href: '/about', icon: Info },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/80 bg-sidebar dark:bg-zinc-950/95 shadow-xs">
      <div className="flex h-16 items-center border-b border-border/70 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Database className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-base tracking-tight text-foreground">DataReady</span>
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent font-extrabold text-base">AI</span>
            </div>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground -mt-0.5">ML Quality Platform</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/5 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-600 shadow-2xs'
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground font-medium',
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm transition-all duration-150'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/70 group-hover:text-blue-600 dark:group-hover:text-blue-400',
                    'mr-3 h-4.5 w-4.5 flex-shrink-0 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6">
          <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Account & Security
          </h3>
          <nav className="space-y-1">
            {userNavigation.map((item) => {
              const isActive = item.tab
                ? pathname === '/settings' && currentTab === item.tab
                : pathname === '/settings' && (!currentTab || currentTab === 'profile')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/5 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-600 shadow-2xs'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground font-medium',
                    'group flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-150'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-muted-foreground/70 group-hover:text-blue-600 dark:group-hover:text-blue-400',
                      'mr-3 h-4 w-4 flex-shrink-0 transition-colors'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-6">
          <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Support & Info
          </h3>
          <nav className="space-y-1">
            {supportNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/5 text-blue-700 dark:text-blue-300 font-semibold border-l-2 border-blue-600 shadow-2xs'
                      : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground font-medium',
                    'group flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-150'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-muted-foreground/70 group-hover:text-blue-600 dark:group-hover:text-blue-400',
                      'mr-3 h-4 w-4 flex-shrink-0 transition-colors'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="border-t border-border/70 p-3 bg-muted/20 space-y-1">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-muted-foreground">
          <span className="font-medium">Theme</span>
          <ThemeToggleCompact />
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 transition-colors cursor-pointer"
          >
            <LogOut className="mr-3 h-4.5 w-4.5 text-muted-foreground/70 group-hover:text-destructive transition-colors" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  )
}
