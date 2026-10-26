import crypto from 'crypto'

const FALLBACK_KEY = 'dataready-ai-secure-encryption-key-32b'

function getDerivedKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_KEY || FALLBACK_KEY
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
 */
export function decryptCredential(cipherPayload: string): string {
  const parts = cipherPayload.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format.')
  }

  const [ivHex, tagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const key = getDerivedKey()

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
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
