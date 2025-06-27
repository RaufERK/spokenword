// lib/token.ts
import crypto from 'crypto'

const algorithm = 'aes-256-cbc'
const secret = process.env.TOKEN_SECRET!
const ivLength = 16

export function encryptToken(data: object): string {
  const iv = crypto.randomBytes(ivLength)
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secret), iv)
  let encrypted = cipher.update(JSON.stringify(data))
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return (
    encodeURIComponent(iv.toString('base64')) +
    ':' +
    encodeURIComponent(encrypted.toString('base64'))
  )
}

export function decryptToken(token: string): {
  login: string
  password: string
} {
  if (!token) throw new Error('Empty token')
  const parts = token.split(':')
  if (parts.length !== 2) throw new Error('Bad token format')
  const [ivBase64, encryptedBase64] = parts
  const iv = Buffer.from(decodeURIComponent(ivBase64), 'base64')
  const encryptedText = Buffer.from(
    decodeURIComponent(encryptedBase64),
    'base64'
  )
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secret), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return JSON.parse(decrypted.toString())
}
