import { createGoogleGenerativeAI } from '@ai-sdk/google'

// In-memory cache for resolved model per API key to avoid repeated ListModels roundtrips
const resolvedModelCache = new Map<string, string>()

/**
 * Dynamically queries Google Generative Language API to discover available models for the provided key,
 * ensuring we never request a 404/deprecated model name.
 */
export async function resolveGeminiModelId(apiKey: string, customModel?: string): Promise<string> {
  if (customModel) {
    return customModel.startsWith('models/') ? customModel : `models/${customModel}`
  }
  if (process.env.GEMINI_MODEL) {
    const envModel = process.env.GEMINI_MODEL.trim()
    return envModel.startsWith('models/') ? envModel : `models/${envModel}`
  }

  // Check cache (keyed by first 16 chars of key)
  const cacheKey = apiKey.slice(0, 16)
  if (resolvedModelCache.has(cacheKey)) {
    return resolvedModelCache.get(cacheKey)!
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()

    if (data.error) {
      const errMsg = data.error.message || ''
      if (errMsg.includes('API_KEY_INVALID') || data.error.status === 'INVALID_ARGUMENT') {
        throw new Error('Your Google Gemini API key is invalid. Please verify and re-enter your key in Settings.')
      }
      console.warn('Google ListModels returned warning:', errMsg)
    } else if (Array.isArray(data.models)) {
      const supportedModels = data.models
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes('generateContent')
        )
        .map((m: { name: string }) => m.name)

      console.log('Google Gemini supported generateContent models for key:', supportedModels)

      // Preferred order of models for fast, accurate chat and dataset quality analysis
      const priorityList = [
        'models/gemini-1.5-flash-latest',
        'models/gemini-1.5-flash',
        'models/gemini-1.5-pro-latest',
        'models/gemini-1.5-pro',
        'models/gemini-2.0-flash-exp',
        'models/gemini-2.0-flash',
        'models/gemini-pro',
      ]

      for (const pref of priorityList) {
        if (supportedModels.includes(pref)) {
          resolvedModelCache.set(cacheKey, pref)
          return pref
        }
      }

      if (supportedModels.length > 0) {
        resolvedModelCache.set(cacheKey, supportedModels[0])
        return supportedModels[0]
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('API key is invalid')) {
      throw err
    }
    console.warn('Could not query ListModels, using safe fallback:', err)
  }

  const fallback = 'models/gemini-1.5-flash'
  resolvedModelCache.set(cacheKey, fallback)
  return fallback
}

/**
 * Returns a configured Google Generative AI Language Model instance.
 * Automatically resolves active model with Google and ensures required 'models/' prefix.
 */
export async function getGeminiModel(customApiKey?: string, customModel?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('AI provider not configured. Please add an API key in Settings.')
  }

  const cleanKey = apiKey.trim()
  const google = createGoogleGenerativeAI({
    apiKey: cleanKey,
  })

  const modelId = await resolveGeminiModelId(cleanKey, customModel)
  return google(modelId as 'models/gemini-1.5-pro-latest')
}
