import { createGoogleGenerativeAI } from '@ai-sdk/google'

// In-memory cache for resolved model per API key to avoid repeated probe roundtrips
const resolvedModelCache = new Map<string, string>()

/**
 * Obsolete or discontinued models that must NEVER be used as defaults
 * or allowed to silently override active models.
 */
export const OBSOLETE_MODELS = new Set([
  'gemini-1.0-pro',
  'gemini-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
])

/**
 * Normalizes a model identifier to ensure it contains exactly one 'models/' prefix,
 * rejecting malformed IDs or obsolete models with clear errors.
 */
export function normalizeModelId(rawModel: string): string {
  if (!rawModel || typeof rawModel !== 'string') {
    throw new Error('Model identifier is required.')
  }
  const trimmed = rawModel.trim()
  if (!trimmed) {
    throw new Error('Model identifier cannot be empty.')
  }
  // Strip duplicate leading 'models/' or slashes
  const clean = trimmed.replace(/^(models\/)+/, '').replace(/^\/+/, '')
  if (!clean || !/^[a-zA-Z0-9._-]+$/.test(clean)) {
    throw new Error(`Malformed model identifier: "${rawModel}". Model names must contain only alphanumeric characters, dots, and hyphens.`)
  }
  if (OBSOLETE_MODELS.has(clean)) {
    throw new Error(`The model "${rawModel}" is deprecated and no longer supported by Google Gemini. Please use a supported model such as gemini-3.6-flash or gemini-3.8-flash.`)
  }
  return `models/${clean}`
}

/**
 * Probes a candidate model with a minimal generateContent ping to verify that
 * Google's API actually accepts requests for this model under the given key.
 * Never logs or reveals the API key.
 */
export async function probeModelAvailability(apiKey: string, modelId: string): Promise<{ available: boolean; status: number; message?: string }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    })

    if (res.status === 200) {
      return { available: true, status: 200 }
    }

    const data = await res.json().catch(() => ({}))
    let errorMsg = data?.error?.message || `HTTP ${res.status}`
    if (data?.error?.details) {
      try {
        errorMsg += ` ${JSON.stringify(data.error.details)}`
      } catch {}
    }
    return { available: false, status: res.status, message: errorMsg }
  } catch (err: unknown) {
    return { available: false, status: 0, message: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Dynamically resolves a verified, supported Google Generative AI model ID for the provided key.
 * Prioritizes gemini-3.6-flash and verifies gemini-3.8-flash as alternative via live probe.
 */
export async function resolveGeminiModelId(apiKey: string, customModel?: string): Promise<string> {
  // 1. If customModel supplied, validate and normalize
  if (customModel) {
    return normalizeModelId(customModel)
  }

  // 2. If GEMINI_MODEL env set, validate and normalize
  if (process.env.GEMINI_MODEL) {
    return normalizeModelId(process.env.GEMINI_MODEL)
  }

  // 3. Check memory cache (keyed by first 16 chars of key)
  const cacheKey = apiKey.slice(0, 16)
  if (resolvedModelCache.has(cacheKey)) {
    return resolvedModelCache.get(cacheKey)!
  }

  // 4. Candidate list in prioritized order per requirements
  const candidateModels = [
    'models/gemini-2.5-flash',
    'models/gemini-2.0-flash',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
    'models/gemini-3.6-flash',
    'models/gemini-3.8-flash',
  ]

  // Probe candidates sequentially to guarantee we never select an unavailable model
  for (const candidate of candidateModels) {
    const probe = await probeModelAvailability(apiKey, candidate)
    if (probe.available) {
      console.log(`[Gemini Provider] Active model verified: ${candidate} (HTTP ${probe.status})`)
      resolvedModelCache.set(cacheKey, candidate)
      return candidate
    } else {
      console.warn(`[Gemini Provider] Candidate ${candidate} unavailable (HTTP ${probe.status}: ${probe.message || 'unknown'}). Probing next candidate...`)
      if (probe.status === 401 || probe.status === 403) {
        throw new Error('Your Google Gemini API key is invalid or unauthorized. Please verify and re-enter your key in Settings.')
      }
      if (probe.status === 429) {
        throw new Error(`Google Gemini quota or rate limit exceeded (429): ${probe.message || 'RESOURCE_EXHAUSTED'}`)
      }
    }
  }

  // 5. If none of the primary candidates responded 200, query ListModels as fallback
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (Array.isArray(data.models)) {
      const liveSupported = data.models
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes('generateContent')
        )
        .map((m: { name: string }) => m.name)
        .filter((name: string) => {
          const clean = name.replace(/^(models\/)+/, '')
          return !OBSOLETE_MODELS.has(clean)
        })

      for (const fallbackModel of liveSupported) {
        const probe = await probeModelAvailability(apiKey, fallbackModel)
        if (probe.available) {
          console.log(`[Gemini Provider] Dynamic active model verified: ${fallbackModel} (HTTP 200)`)
          resolvedModelCache.set(cacheKey, fallbackModel)
          return fallbackModel
        }
      }
    }
  } catch (err) {
    console.warn('[Gemini Provider] Dynamic model discovery failed:', err)
  }

  // Safe modern default fallback
  const fallback = 'models/gemini-3.6-flash'
  resolvedModelCache.set(cacheKey, fallback)
  return fallback
}

/**
 * Returns a configured Google Generative AI Language Model instance.
 * Automatically resolves active verified model and ensures required 'models/' prefix.
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
