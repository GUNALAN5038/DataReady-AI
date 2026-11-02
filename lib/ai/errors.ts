/**
 * DataReady AI — Gemini & AI Provider Error Classification & Policy
 *
 * Categorizes errors from Google Generative AI and AI SDK into standard codes,
 * preventing useless retries on daily quota exhaustion and providing
 * sanitized, user-friendly messages without exposing raw provider payloads.
 */

export type AIErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'INVALID_API_KEY'
  | 'MODEL_UNAVAILABLE'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'DECRYPTION_FAILED'
  | 'SERVICE_UNAVAILABLE'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

export interface ClassifiedAIError {
  code: AIErrorCode
  status: number
  message: string
  friendlyMessage: string
  isDailyQuota: boolean
  retryable: boolean
  retryAfterSeconds?: number
  configureKeyUrl?: string
}

/**
 * Regex patterns indicating daily request limit or quota exhaustion.
 */
const DAILY_QUOTA_PATTERNS = [
  /generate_content_free_tier_requests/i,
  /daily request limit/i,
  /daily_request_limit/i,
  /daily.*limit.*exceeded/i,
  /free[_\s]tier.*daily/i,
  /daily.*quota/i,
  /quota.*daily/i,
  /per[_\s]?day/i,
  /exceeded your current quota/i,
  /quota exceeded/i,
]

/**
 * Regex patterns indicating transient per-minute rate limits.
 */
const RATE_LIMIT_PATTERNS = [
  /rate[_\s]?limit/i,
  /too many requests/i,
  /per[_\s]?minute/i,
  /rpm/i,
  /tpm/i,
  /resource_exhausted/i,
]

/**
 * Regex patterns indicating invalid or unauthorized API credentials.
 */
const INVALID_KEY_PATTERNS = [
  /api_key_invalid/i,
  /api key not valid/i,
  /invalid api key/i,
  /unauthenticated/i,
  /permission_denied/i,
  /unauthorized/i,
  /401/i,
]

/**
 * Regex patterns indicating unconfigured API key.
 */
const NOT_CONFIGURED_PATTERNS = [
  /ai provider not configured/i,
  /ai provider is not configured/i,
  /api key is not configured/i,
  /no api key/i,
  /please add an api key in settings/i,
]

/**
 * Regex patterns indicating unavailable or discontinued models.
 */
const MODEL_UNAVAILABLE_PATTERNS = [
  /models\/.*not found/i,
  /model.*not found/i,
  /is not supported for generatecontent/i,
  /deprecated/i,
  /discontinued/i,
  /malformed model/i,
]

/**
 * Extracts raw error details string from unknown error object.
 */
function extractRawErrorText(error: unknown): { text: string; statusCode: number | null; retryAfter?: number } {
  let text = ''
  let statusCode: number | null = null
  let retryAfter: number | undefined

  if (!error) return { text, statusCode }

  if (typeof error === 'string') {
    text = error
  } else if (typeof error === 'object' && error !== null) {
    const anyErr = error as unknown as Record<string, unknown>
    if (error instanceof Error) {
      text = error.message || ''
    } else if (typeof anyErr.message === 'string') {
      text = anyErr.message
    }

    if (typeof anyErr.statusCode === 'number') statusCode = anyErr.statusCode
    if (typeof anyErr.status === 'number') statusCode = anyErr.status
    if (typeof anyErr.code === 'number') statusCode = anyErr.code

    if (typeof anyErr.responseBody === 'string') {
      text += ' ' + anyErr.responseBody
    } else if (anyErr.responseBody && typeof anyErr.responseBody === 'object') {
      text += ' ' + JSON.stringify(anyErr.responseBody)
    }

    if (anyErr.cause) {
      text += ' ' + (typeof anyErr.cause === 'string' ? anyErr.cause : JSON.stringify(anyErr.cause))
    }

    if (anyErr.details) {
      text += ' ' + (typeof anyErr.details === 'string' ? anyErr.details : JSON.stringify(anyErr.details))
    }

    if (anyErr.errorDetails) {
      text += ' ' + (typeof anyErr.errorDetails === 'string' ? anyErr.errorDetails : JSON.stringify(anyErr.errorDetails))
    }

    if (anyErr.responseHeaders && typeof anyErr.responseHeaders === 'object') {
      const headers = anyErr.responseHeaders as Record<string, string>
      const ra = headers['retry-after'] || headers['Retry-After']
      if (ra && !isNaN(Number(ra))) {
        retryAfter = Number(ra)
      }
    }
  }

  // Check for retryDelay in Google RPC error details (e.g. "60s", 86400s)
  const delayMatch = text.match(/retryDelay[\\]*["']?\s*:\s*[\\]*["']?(\d+(?:\.\d+)?)s/i)
  if (delayMatch && delayMatch[1]) {
    retryAfter = parseFloat(delayMatch[1])
  }

  return { text, statusCode, retryAfter }
}

/**
 * Classifies any AI error into a structured ClassifiedAIError policy object.
 */
export function classifyAIError(error: unknown): ClassifiedAIError {
  const { text, statusCode, retryAfter } = extractRawErrorText(error)
  const is429 = statusCode === 429 || /429/.test(text)

  // 1. Check for Decryption Failure
  if (/failed to decrypt/i.test(text) || /decryption.*fail/i.test(text)) {
    return {
      code: 'DECRYPTION_FAILED',
      status: 503,
      message: 'Failed to decrypt saved API key.',
      friendlyMessage: 'Failed to decrypt saved API key. Please re-enter your API key in Settings.',
      isDailyQuota: false,
      retryable: false,
      configureKeyUrl: '/settings/keys',
    }
  }

  // 2. Check for Provider Not Configured
  if (NOT_CONFIGURED_PATTERNS.some(p => p.test(text))) {
    return {
      code: 'PROVIDER_NOT_CONFIGURED',
      status: 503,
      message: 'AI provider not configured.',
      friendlyMessage: 'AI provider not configured. Please add an authorized Gemini API key in Settings to unlock AI-powered insights.',
      isDailyQuota: false,
      retryable: false,
      configureKeyUrl: '/settings/keys',
    }
  }

  // 2. Check for Invalid or Unauthorized API Key
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    INVALID_KEY_PATTERNS.some(p => p.test(text))
  ) {
    // Make sure this is not a 403 quota error before classifying as invalid key
    const isQuotaRelated = DAILY_QUOTA_PATTERNS.some(p => p.test(text))
    if (!isQuotaRelated) {
      return {
        code: 'INVALID_API_KEY',
        status: 401,
        message: 'Invalid Google Gemini API key.',
        friendlyMessage: 'Your Google Gemini API key is invalid or unauthorized. Please verify and update your key in Settings → AI Keys.',
        isDailyQuota: false,
        retryable: false,
        configureKeyUrl: '/settings/keys',
      }
    }
  }

  // 3. Check for Model Unavailable
  if (statusCode === 404 || MODEL_UNAVAILABLE_PATTERNS.some(p => p.test(text))) {
    return {
      code: 'MODEL_UNAVAILABLE',
      status: 503,
      message: 'The requested Gemini model is unavailable or unsupported.',
      friendlyMessage: 'The requested Gemini model is currently unavailable or unsupported. Please check your model configuration in Settings.',
      isDailyQuota: false,
      retryable: false,
    }
  }

  // 4. Check for Daily Quota Exhaustion (HIGHEST PRIORITY 429 CHECK)
  if (DAILY_QUOTA_PATTERNS.some(p => p.test(text))) {
    return {
      code: 'QUOTA_EXCEEDED',
      status: 429,
      message: 'Gemini API daily quota exceeded.',
      friendlyMessage: 'AI Insights are temporarily unavailable because the configured Gemini API quota has been reached. You can try again after the quota resets or configure another authorized API key.',
      isDailyQuota: true,
      retryable: false, // NEVER retry daily quota exhaustion
      retryAfterSeconds: retryAfter,
      configureKeyUrl: '/settings/keys',
    }
  }

  // 5. Check for Transient Rate Limits (per-minute or burst limit)
  if (is429 || RATE_LIMIT_PATTERNS.some(p => p.test(text))) {
    return {
      code: 'RATE_LIMITED',
      status: 429,
      message: 'Gemini API request rate limit reached.',
      friendlyMessage: 'Google Gemini request rate limit reached. Please wait a moment before trying again.',
      isDailyQuota: false,
      retryable: true,
      retryAfterSeconds: retryAfter,
    }
  }

  // 6. Check for Server / Network Errors (500, 502, 503, 504, fetch failed)
  const isServerOrNetwork =
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    /fetch failed|network|ECONNRESET|ETIMEDOUT|socket hang up/i.test(text)

  if (isServerOrNetwork) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
      message: 'AI service is temporarily unavailable.',
      friendlyMessage: 'AI insights are temporarily unavailable due to a service error. Please try again in a few moments.',
      isDailyQuota: false,
      retryable: true,
      retryAfterSeconds: retryAfter,
    }
  }

  // 7. Check for Type Validation / Parsing Error
  if (/type validation failed|invalid input: expected object|zoderror|jsonparseerror/i.test(text)) {
    return {
      code: 'SCHEMA_VALIDATION_ERROR',
      status: 422,
      message: 'AI response schema validation failed.',
      friendlyMessage: 'Failed to format AI insights according to schema. Please try again to regenerate clean insights.',
      isDailyQuota: false,
      retryable: true,
    }
  }

  // 8. Fallback for unexpected errors
  return {
    code: 'UNKNOWN_ERROR',
    status: statusCode || 500,
    message: 'An unexpected error occurred during AI processing.',
    friendlyMessage: 'Failed to generate AI insights due to an unexpected error. Please try again later.',
    isDailyQuota: false,
    retryable: false,
  }
}

/**
 * Executes an async operation with bounded retry logic.
 * Immediately rejects on non-retryable errors (including daily quota exhaustion).
 */
export async function executeWithSafeRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxTransientRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
  } = {}
): Promise<T> {
  const maxRetries = options.maxTransientRetries ?? 1
  const baseDelay = options.baseDelayMs ?? 1000
  const maxDelay = options.maxDelayMs ?? 4000

  let attempt = 0

  while (true) {
    try {
      return await operation()
    } catch (err: unknown) {
      attempt++
      const classified = classifyAIError(err)

      // STOP IMMEDIATELY if non-retryable or daily quota
      if (!classified.retryable || classified.isDailyQuota || attempt > maxRetries) {
        throw err
      }

      // Compute bounded backoff with jitter
      let delayMs = classified.retryAfterSeconds
        ? classified.retryAfterSeconds * 1000
        : Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)

      // Add 10-25% random jitter
      const jitter = Math.random() * 300
      delayMs = Math.min(delayMs + jitter, maxDelay)

      // If requested delay is too large, abort retry to prevent blocking
      if (delayMs > maxDelay) {
        throw err
      }

      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}
