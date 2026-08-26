import crypto from 'crypto'

const MAGIC_TTL_SEC = 7 * 24 * 60 * 60

type LoginTokenPayload = {
  userId: number
  exp: number
  v: number
}

function getSecret(): string {
  const secret = process.env.TOKEN_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('TOKEN_SECRET is not configured')
  }
  return secret
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createLoginToken(userId: number, tokenVersion: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      exp: Math.floor(Date.now() / 1000) + MAGIC_TTL_SEC,
      v: tokenVersion,
    } satisfies LoginTokenPayload)
  ).toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

export function readLoginToken(token: string): LoginTokenPayload {
  if (!token) throw new Error('Empty token')
  const [payload, sig] = token.split('.')
  if (!payload || !sig) throw new Error('Bad token format')

  const expected = signPayload(payload)
  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Bad token')
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as LoginTokenPayload
  if (!Number.isInteger(data.userId) || !Number.isInteger(data.exp) || !Number.isInteger(data.v)) {
    throw new Error('Bad token')
  }
  if (data.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Expired token')
  }

  return data
}

export function matchesLoginToken(
  payload: LoginTokenPayload,
  userId: number,
  tokenVersion: number
): boolean {
  return payload.userId === userId && payload.v === tokenVersion
}
