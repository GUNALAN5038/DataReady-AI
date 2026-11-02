export interface ApiKeyInfo {
  id: string
  provider: string
  key_preview: string
  is_active: boolean
  created_at: string
  last_used_at?: string | null
}

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  metadata?: Record<string, unknown> | null
}
