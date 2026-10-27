import { createClient } from '@/lib/supabase/server'
import { decryptCredential } from '@/lib/crypto'
import { getGeminiModel } from './gemini'

/**
 * Retrieves the appropriate AI Model instance following the priority:
 * 1. User's decrypted Gemini API key from api_provider_keys table
 * 2. GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY from process.env
 * 3. Throws a clear, actionable error if neither is available.
 */
export async function getAIProvider(userId?: string) {
  let userKeyError: string | null = null

  // 1. If a userId is provided, look for an active user-configured key
  if (userId) {
    try {
      const supabase = await createClient()
      const { data: keyRecord, error: keyQueryError } = await supabase
        .from('api_provider_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'gemini')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (keyQueryError) {
        console.warn('Could not query api_provider_keys for user:', keyQueryError.message)
      } else if (keyRecord && keyRecord.encrypted_key) {
        try {
          const decryptedKey = decryptCredential(keyRecord.encrypted_key)
          if (decryptedKey && decryptedKey.trim().length > 0) {
            // Update last_used_at asynchronously without blocking
            supabase
              .from('api_provider_keys')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', keyRecord.id)
              .then(() => {})

            return await getGeminiModel(decryptedKey.trim())
          }
        } catch (decryptErr) {
          console.warn('Could not decrypt stored user API key (encryption key mismatch):', decryptErr)
          userKeyError = 'Failed to decrypt saved API key. Please re-enter your API key in Settings.'
        }
      }
    } catch (err) {
      console.warn('Error accessing user API key record:', err)
    }
  }

  // 2. Fall back to application-level environment key
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (envKey && envKey.trim().length > 0) {
    return await getGeminiModel(envKey.trim())
  }

  // 3. Clear message when no key exists
  if (userKeyError) {
    throw new Error(userKeyError)
  }
  throw new Error('AI provider not configured. Please add an API key in Settings.')
}
