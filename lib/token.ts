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
  console.log(24, secret)
  if (!token) throw new Error('Empty token')
  console.log(25, token)
  const parts = token.split(':')
  console.log(27, parts)
  if (parts.length !== 2) throw new Error('Bad token format')
  console.log(29, parts.length === 2)
  const [ivBase64, encryptedBase64] = parts
  console.log(31, ivBase64, encryptedBase64)
  const iv = Buffer.from(decodeURIComponent(ivBase64), 'base64')
  console.log(33, iv)
  const encryptedText = Buffer.from(
    decodeURIComponent(encryptedBase64),
    'base64'
  )
  console.log(38, encryptedText)
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secret), iv)
  console.log(40, decipher)
  let decrypted = decipher.update(encryptedText)
  console.log(42, decrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  console.log(44, JSON.parse(decrypted.toString()))
  return JSON.parse(decrypted.toString())
}
