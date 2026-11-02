import { createClient } from '@supabase/supabase-js'
import { Config } from './config'
import { ExpoSecureStoreAdapter } from './secure-store'

export const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * Helper to obtain the current user's valid Supabase JWT access token.
 * Used for authenticating server-side API calls with Authorization: Bearer <token>.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
