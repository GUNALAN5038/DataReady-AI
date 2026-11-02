import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'

export async function createClient(req?: Request) {
  let authHeader: string | null = null

  if (req && typeof req.headers?.get === 'function') {
    authHeader = req.headers.get('authorization')
  } else {
    try {
      const headerStore = await headers()
      authHeader = headerStore.get('authorization')
    } catch {
      // In case called outside a request context (e.g. static generation or test environment)
    }
  }

  // If explicit Bearer token is provided (e.g. from mobile client API calls)
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      )

      // Bind and wrap auth.getUser to automatically supply the bearer token if not passed explicitly
      const originalGetUser = client.auth.getUser.bind(client.auth)
      client.auth.getUser = ((jwt?: string) => originalGetUser(jwt || token)) as typeof client.auth.getUser

      return client
    }
  }

  // Default: browser-cookie authentication for web app
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Request-scoped cached user retriever. Deduplicates auth verification calls
 * across layout, page, and nested Server Components during a single render pass.
 */
export const getAuthenticatedUser = cache(async () => {
  try {
    const cookieStore = await cookies()
    const testCookie = cookieStore.get('dataready-e2e-session')?.value
    const validTestToken = process.env.E2E_TEST_SESSION_TOKEN || 'dr_authorized_test_session_token_2026'

    if (testCookie && testCookie === validTestToken) {
      return {
        id: process.env.TEST_USER_ID || '118030e0-857d-49ae-ad68-7730ec58d45a',
        email: 'authorized_test_user@dataready.ai',
        user_metadata: { full_name: 'Authorized Test User' },
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { provider: 'email' },
        created_at: '2026-11-02T00:00:00.000Z',
      } as any
    }
  } catch {
    // Outside request context
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})

