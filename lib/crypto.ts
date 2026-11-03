import crypto from 'crypto'

const FALLBACK_KEY = 'dataready-ai-secure-encryption-key-32b'

export class DecryptionError extends Error {
  public readonly code: string
  constructor(message: string = 'Failed to decrypt saved API key. Please re-enter your API key in Settings.') {
    super(message)
    this.name = 'DecryptionError'
    this.code = 'DECRYPTION_FAILED'
  }
}

function getDerivedKey(customSecret?: string): Buffer {
  const secret = customSecret || process.env.API_KEY_ENCRYPTION_KEY || FALLBACK_KEY
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * Encrypts sensitive credentials using AES-256-GCM.
 * Output format: iv_hex:tag_hex:ciphertext_hex
 */
export function encryptCredential(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const key = getDerivedKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts AES-256-GCM encrypted credentials.
 * Supports primary configured secret with fallback decryption for backward compatibility.
 */
export function decryptCredential(cipherPayload: string): string {
  if (!cipherPayload || typeof cipherPayload !== 'string') {
    throw new DecryptionError('Invalid or empty encrypted payload.')
  }

  const parts = cipherPayload.split(':')
  if (parts.length !== 3) {
    throw new DecryptionError('Invalid encrypted payload format.')
  }

  const [ivHex, tagHex, encryptedHex] = parts
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new DecryptionError('Malformed encrypted credential payload.')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')

  // 1. Try decrypting with currently active key
  const primaryKey = getDerivedKey()
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', primaryKey, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // 2. If API_KEY_ENCRYPTION_KEY is configured and differs from FALLBACK_KEY,
    // attempt decryption using FALLBACK_KEY for backward compatibility.
    if (process.env.API_KEY_ENCRYPTION_KEY && process.env.API_KEY_ENCRYPTION_KEY !== FALLBACK_KEY) {
      try {
        const fallbackKey = getDerivedKey(FALLBACK_KEY)
        const decipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
      } catch {
        // Both attempts failed
      }
    }

    throw new DecryptionError(
      'Failed to decrypt saved API key. Please re-enter your API key in Settings.'
    )
  }
}

/**
 * Generates a safe masked preview for an API key (e.g. AIzaSy...4A2x).
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '••••••••••••••••'
  const prefix = apiKey.substring(0, 6)
  const suffix = apiKey.substring(apiKey.length - 4)
  return `${prefix}••••••••••••${suffix}`
}
