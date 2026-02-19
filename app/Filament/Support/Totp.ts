import { createHmac, createHash, randomBytes } from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function normalizeBase32(input: string): string {
  return input.toUpperCase().replace(/[^A-Z2-7]/g, '')
}

function base32Encode(buffer: Buffer): string {
  let bits = ''
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0')
  }

  let output = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5)
    if (chunk.length < 5) {
      output += BASE32_ALPHABET[Number.parseInt(chunk.padEnd(5, '0'), 2)]
    } else {
      output += BASE32_ALPHABET[Number.parseInt(chunk, 2)]
    }
  }

  return output
}

function base32Decode(input: string): Buffer {
  const clean = normalizeBase32(input)
  if (!clean) return Buffer.alloc(0)

  let bits = ''
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index < 0) continue
    bits += index.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2))
  }

  return Buffer.from(bytes)
}

export function generateTotpSecret(bytes: number = 20): string {
  return base32Encode(randomBytes(bytes))
}

export function buildOtpAuthUri(options: {
  secret: string
  issuer: string
  accountName: string
}): string {
  const issuer = options.issuer.trim()
  const accountName = options.accountName.trim()
  const label = encodeURIComponent(`${issuer}:${accountName}`)
  const params = new URLSearchParams({
    secret: normalizeBase32(options.secret),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })

  return `otpauth://totp/${label}?${params.toString()}`
}

export function generateTotpToken(options: {
  secret: string
  timestamp?: number
  period?: number
  digits?: number
}): string {
  const period = options.period ?? 30
  const digits = options.digits ?? 6
  const timestamp = options.timestamp ?? Date.now()
  const counter = Math.floor(timestamp / 1000 / period)

  const key = base32Decode(options.secret)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter), 0)

  const digest = createHmac('sha1', key).update(msg).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const codeInt = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits

  return codeInt.toString().padStart(digits, '0')
}

export function verifyTotpToken(options: {
  secret: string
  token: string
  timestamp?: number
  period?: number
  digits?: number
  window?: number
}): boolean {
  const normalizedToken = options.token.replace(/\s+/g, '')
  if (!/^\d{6,8}$/.test(normalizedToken)) {
    return false
  }

  const timestamp = options.timestamp ?? Date.now()
  const period = options.period ?? 30
  const digits = options.digits ?? 6
  const window = options.window ?? 1

  for (let drift = -window; drift <= window; drift++) {
    const token = generateTotpToken({
      secret: options.secret,
      timestamp: timestamp + drift * period * 1000,
      period,
      digits,
    })
    if (token === normalizedToken) {
      return true
    }
  }

  return false
}

export function generateRecoveryCodes(count: number = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').slice(0, 10).toUpperCase()
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`
  })
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(code)).digest('hex')
}
