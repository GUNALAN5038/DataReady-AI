/**
 * Mobile Environment & Endpoint Configuration
 *
 * All variables read EXPO_PUBLIC_* configuration.
 * Server credentials, private tokens, and database secrets are never bundled in this client.
 */

export const Config = {
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co').trim(),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key').trim(),
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
}

export function isSupabaseConfigured(): boolean {
  return (
    Config.supabaseUrl !== 'https://placeholder.supabase.co' &&
    Config.supabaseAnonKey !== 'placeholder-anon-key' &&
    Config.supabaseAnonKey !== 'YOUR_PUBLISHABLE_KEY' &&
    Config.supabaseUrl.startsWith('https://')
  )
}

export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured()) return null
  return 'Supabase client is not configured with a valid project URL and publishable key. Please verify EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
}
