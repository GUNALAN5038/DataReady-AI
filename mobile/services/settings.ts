import { supabase } from '../lib/supabase'
import { apiRequest } from './api'
import type { UserProfile } from '../types/auth'
import type { ApiKeyInfo, NotificationItem } from '../types/settings'

export async function fetchUserProfile(): Promise<{ profile: UserProfile | null; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { profile: null, error: 'Unauthorized' }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    return {
      profile: {
        id: data.id,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        preferredTheme: data.preferred_theme || 'system',
        preferredLanguage: data.preferred_language || 'en',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (err: unknown) {
    return { profile: null, error: err instanceof Error ? err.message : 'Failed to fetch profile' }
  }
}

export async function updateUserProfile(fullName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update profile' }
  }
}

export async function fetchApiKeys(): Promise<{ keys: ApiKeyInfo[]; error?: string }> {
  const res = await apiRequest<{ keys: ApiKeyInfo[] }>('/api/user/keys', {
    method: 'GET',
  })

  if (res.error) {
    return { keys: [], error: res.error }
  }
  return { keys: res.data?.keys || [] }
}

export async function saveApiKey(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest<{ success: boolean }>('/api/user/keys', {
    method: 'POST',
    body: JSON.stringify({ provider, apiKey }),
  })

  if (res.error) {
    return { success: false, error: res.error }
  }
  return { success: true }
}

export async function fetchNotifications(): Promise<{ notifications: NotificationItem[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { notifications: [], error: error.message }
    }
    return { notifications: (data as NotificationItem[]) || [] }
  } catch (err: unknown) {
    return { notifications: [], error: err instanceof Error ? err.message : 'Failed to fetch notifications' }
  }
}
