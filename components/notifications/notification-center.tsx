'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  is_read?: boolean
  created_at: string
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSec < 60) return 'just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return dateString
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'success':
    case 'upload_success':
    case 'transformation_success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
    case 'security':
      return <ShieldCheck className="h-4 w-4 text-violet-500 shrink-0" />
    case 'analysis_completed':
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-500 shrink-0" />
  }
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/notifications')
      if (!res.ok) {
        throw new Error(`Failed to load notifications (${res.status})`)
      }
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching notifications'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 45000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchNotifications()
    }
  }

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    try {
      setIsUpdating(true)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, is_read: true })))
      setUnreadCount(0)

      await fetch('/api/notifications/read-all', { method: 'PATCH' })
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      fetchNotifications()
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const target = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }

      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete notification:', err)
      fetchNotifications()
    }
  }

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read && !n.is_read)
      : notifications

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        className="relative inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card">
        <SheetHeader className="p-4 border-b border-border/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-bold">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNotifications}
                disabled={isLoading}
                aria-label="Refresh notifications"
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={isUpdating}
                  className="h-8 px-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          <SheetDescription className="sr-only">
            Notification history, alerts, and operational updates
          </SheetDescription>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                activeTab === 'unread'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchNotifications}>
                Try Again
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mt-2">All caught up!</h4>
              <p className="text-xs max-w-xs text-muted-foreground">
                {activeTab === 'unread'
                  ? 'You have read all your notifications.'
                  : 'No notifications yet. Activity updates from dataset processing will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isUnread = !item.read && !item.is_read
              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 transition-colors relative flex items-start gap-3 group',
                    isUnread
                      ? 'bg-blue-50/40 dark:bg-blue-950/20'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <div className="mt-0.5">{getNotificationIcon(item.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className={cn('text-xs font-semibold leading-tight text-foreground truncate', isUnread && 'text-blue-900 dark:text-blue-200 font-bold')}>
                        {item.title}
                      </h5>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                        className="p-1 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(item.id)}
                      title="Delete"
                      className="p-1 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
