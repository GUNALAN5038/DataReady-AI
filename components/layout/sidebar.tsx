'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Database,
  MessageSquare,
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

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload Dataset', href: '/upload', icon: Upload },
  { name: 'My Datasets', href: '/datasets', icon: Database },
  { name: 'AI Chat', href: '/chat', icon: MessageSquare },
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
    <div className="flex h-full w-64 flex-col border-r bg-white dark:bg-zinc-950">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Database className="h-5 w-5 text-blue-600" />
          <span>DataReady AI</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
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
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800',
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-blue-700 dark:text-blue-100' : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-8">
          <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            User
          </h3>
          <nav className="mt-2 space-y-1 px-2">
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
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800',
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-blue-700 dark:text-blue-100' : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 h-5 w-5 flex-shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mt-8">
          <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Support
          </h3>
          <nav className="mt-2 space-y-1 px-2">
            {supportNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800',
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-blue-700 dark:text-blue-100' : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 h-5 w-5 flex-shrink-0'
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

      <div className="border-t p-4">
        <form action={logout}>
          <button
            type="submit"
            className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}
