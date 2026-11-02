import { Config } from '../lib/config'
import { getAccessToken } from '../lib/supabase'

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
}

/**
 * Centralized authenticated API caller for server-side Next.js endpoints.
 * Automatically attaches the authenticated user's Supabase JWT as Authorization: Bearer <token>.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAccessToken()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${Config.apiUrl}${cleanEndpoint}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Only set Content-Type: application/json if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type') || ''
    let json: Record<string, unknown> | null = null

    if (contentType.includes('application/json')) {
      json = await response.json().catch(() => null)
    } else {
      const text = await response.text().catch(() => '')
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          json = JSON.parse(text)
        } catch {
          // Plain text response
        }
      }
    }

    if (!response.ok) {
      const errorMessage =
        (json?.error as string) ||
        (json?.message as string) ||
        `Request failed with status ${response.status}`
      return {
        error: errorMessage,
        status: response.status,
      }
    }

    return {
      data: (json ?? ({} as unknown)) as T,
      status: response.status,
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { error: 'Request timed out after 30 seconds. Please check your connection.', status: 408 }
    }
    const message = err instanceof Error ? err.message : 'Network request failed'
    return {
      error: `Connection error: ${message}. Make sure your laptop dev server is reachable at ${Config.apiUrl}`,
      status: 0,
    }
  }
}
