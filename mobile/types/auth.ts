import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'

export type User = SupabaseUser

export type Session = SupabaseSession

export interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface UserProfile {
  id: string
  fullName: string | null
  avatarUrl: string | null
  preferredTheme: string
  preferredLanguage: string
  createdAt: string
  updatedAt: string
}
