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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
    case 'error':
      return <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
    case 'security':
      return <ShieldCheck className="h-5 w-5 text-violet-500 shrink-0" />
    case 'analysis_completed':
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500 shrink-0" />
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
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
  }, [fetchNotifications])

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2.5 py-0.5 rounded-full font-bold">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Operational activity, analysis milestones, and dataset transformation alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={markAllAsRead}
              disabled={isUpdating}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          All Activity ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={cn(
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer',
            activeTab === 'unread'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          Unread Only ({unreadCount})
        </button>
      </div>

      <Card className="border-border/80 shadow-xs overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Loading your activity history...</p>
          </CardContent>
        ) : error ? (
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchNotifications}>
              Retry Connection
            </Button>
          </CardContent>
        ) : filteredNotifications.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Bell className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <h3 className="font-semibold text-foreground text-base">No notifications</h3>
            <p className="text-sm max-w-sm text-muted-foreground">
              {activeTab === 'unread'
                ? 'All caught up! You have no unread notifications.'
                : 'Your notifications and processing events will appear here once you upload and transform datasets.'}
            </p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredNotifications.map((item) => {
              const isUnread = !item.read && !item.is_read
              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-5 transition-colors flex items-start gap-4 group',
                    isUnread
                      ? 'bg-blue-50/40 dark:bg-blue-950/20'
                      : 'hover:bg-muted/40'
                  )}
                >
                  <div className="mt-1">{getNotificationIcon(item.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4
                        className={cn(
                          'text-sm font-semibold text-foreground',
                          isUnread && 'text-blue-900 dark:text-blue-200 font-bold'
                        )}
                      >
                        {item.title}
                      </h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(item.id)}
                        title="Mark as read"
                        className="h-8 px-2 text-xs"
                      >
                        <Check className="h-4 w-4 mr-1 text-blue-600" />
                        Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(item.id)}
                      title="Delete notification"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {isUnread && (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0 self-center" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

