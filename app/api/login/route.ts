import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const ADMIN_USER = process.env.ADMIN_USER
const ADMIN_PASS = process.env.ADMIN_PASS

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 401 })
  }

  const token = await new SignJWT({ user: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: 'spoken_auth',
    value: token,
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 часов
  })

  return response
}
