import crypto from 'crypto'

type LoginTokenPayload = {
  userId: number
  fp: string
}

function getSecret(): string {
  const secret = process.env.TOKEN_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('TOKEN_SECRET is not configured')
  }
  return secret
}

function fingerprint(userId: number, password: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${userId}:${password}`)
    .digest('hex')
    .slice(0, 16)
}

export function createLoginToken(userId: number, password: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      fp: fingerprint(userId, password),
    } satisfies LoginTokenPayload)
  ).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function readLoginToken(token: string): LoginTokenPayload {
  if (!token) throw new Error('Empty token')
  const [payload, sig] = token.split('.')
  if (!payload || !sig) throw new Error('Bad token format')

  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Bad token')
  }

  const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as LoginTokenPayload
  if (!Number.isInteger(data.userId) || typeof data.fp !== 'string' || data.fp.length === 0) {
    throw new Error('Bad token')
  }

  return data
}

export function matchesLoginToken(
  payload: LoginTokenPayload,
  userId: number,
  password: string
): boolean {
  const expected = fingerprint(userId, password)
  const actualBuffer = Buffer.from(payload.fp)
  const expectedBuffer = Buffer.from(expected)
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  )
}
