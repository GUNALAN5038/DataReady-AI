import { createGoogleGenerativeAI } from '@ai-sdk/google'

/**
 * Returns a configured Google Generative AI Language Model instance.
 * Ensures the model identifier always contains the required 'models/' prefix
 * to prevent 404 Not Found errors against Google's API.
 */
export function getGeminiModel(customApiKey?: string, customModel?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('AI provider not configured. Please add an API key in Settings.')
  }

  const google = createGoogleGenerativeAI({
    apiKey: apiKey.trim(),
  })

  // Google Generative AI API v1beta requires the 'models/' prefix:
  // e.g., 'models/gemini-1.5-flash', 'models/gemini-1.5-pro', or 'models/gemini-1.5-pro-latest'.
  // Automatically normalize any missing prefix so calls never fail with HTTP 404.
  const rawModel = customModel || process.env.GEMINI_MODEL || 'models/gemini-1.5-flash'
  const normalizedModelId = rawModel.startsWith('models/') ? rawModel : `models/${rawModel}`

  return google(normalizedModelId as 'models/gemini-1.5-pro-latest')
}
