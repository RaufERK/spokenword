import type { Request } from 'express'
import { decode } from 'next-auth/jwt'

const SESSION_COOKIE_NAMES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
]

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    let value = part.slice(eq + 1).trim()
    try {
      value = decodeURIComponent(value)
    } catch {
      // keep raw value
    }
    cookies[key] = value
  }
  return cookies
}

function sessionTokenFromCookies(cookies: Record<string, string>) {
  for (const name of SESSION_COOKIE_NAMES) {
    if (cookies[name]) return cookies[name]
    const chunks: string[] = []
    for (let i = 0; ; i += 1) {
      const piece = cookies[`${name}.${i}`]
      if (!piece) break
      chunks.push(piece)
    }
    if (chunks.length > 0) return chunks.join('')
  }
  return null
}

export async function requireUploader(
  req: Request,
  allowedRoles: string[]
): Promise<{ userId: number; role: string } | { error: string; status: number }> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return { error: 'Unauthorized', status: 401 }
  }

  const raw = sessionTokenFromCookies(parseCookies(req.headers.cookie))
  let token = null
  if (raw) {
    try {
      token = await decode({ token: raw, secret })
    } catch {
      token = null
    }
  }
  const userId = Number.parseInt(String(token?.id || token?.sub || ''), 10)
  const role = String(token?.role || '')

  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: 'Unauthorized', status: 401 }
  }

  if (!allowedRoles.includes(role)) {
    return { error: 'Forbidden', status: 403 }
  }

  return { userId, role }
}
