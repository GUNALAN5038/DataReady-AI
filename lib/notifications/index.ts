import { createClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'analysis_completed'
  | 'transformation_success'
  | 'upload_success'
  | 'security'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type?: NotificationType
  metadata?: Record<string, unknown>
}

export interface NotificationRecord {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  is_read?: boolean
  created_at: string
}

/**
 * Creates and persists a notification for a user in the Supabase notifications table.
 * Adheres to RLS and user ownership boundaries.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  metadata,
}: CreateNotificationParams): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required to create a notification.' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: title.trim().slice(0, 255),
        message: message.trim(),
        type,
        read: false,
      })
      .select('id')
      .single()

    if (error) {
      console.warn('Failed to insert notification into database:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, notificationId: data?.id }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.warn('Notification creation exception:', errMsg)
    return { success: false, error: errMsg }
  }
}

