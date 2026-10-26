import { createClient } from '@/lib/supabase/server'
import { decryptCredential } from '@/lib/crypto'
import { getGeminiModel } from './gemini'

/**
 * Retrieves the appropriate AI Model instance following the priority:
 * 1. User's decrypted Gemini API key from api_provider_keys table
 * 2. GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY from process.env
 * 3. Throws descriptive error if neither is available.
 */
export async function getAIProvider(userId?: string) {
  // 1. If a userId is provided, look for an active user-configured key
  if (userId) {
    try {
      const supabase = await createClient()
      const { data: keyRecord } = await supabase
        .from('api_provider_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'gemini')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (keyRecord && keyRecord.encrypted_key) {
        const decryptedKey = decryptCredential(keyRecord.encrypted_key)
        
        // Update last_used_at asynchronously
        supabase
          .from('api_provider_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', keyRecord.id)
          .then(() => {})

        return getGeminiModel(decryptedKey)
      }
    } catch (err) {
      console.warn('Could not retrieve or decrypt user API key:', err)
      // Fall through to environment key
    }
  }

  // 2. Fall back to application-level environment key
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (envKey) {
    return getGeminiModel(envKey)
  }

  // 3. Clear message when no key exists
  throw new Error('AI provider not configured. Please add an API key in Settings.')
}
