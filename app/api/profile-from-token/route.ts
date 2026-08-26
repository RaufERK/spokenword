import prisma from '@/lib/prisma'
import { consumeRateLimit, getRequestIp } from '@/lib/rate-limit'
import { matchesLoginToken, readLoginToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  const allowed = await consumeRateLimit(`profile-token:${getRequestIp(req)}`, 30, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const payload = readLoginToken(token)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        city: true,
        login: true,
        role: true,
        tokenVersion: true,
      },
    })

    if (!user || !matchesLoginToken(payload, user.id, user.tokenVersion)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      city: user.city,
      login: user.login,
      role: user.role,
    })
  } catch {
    return NextResponse.json({ error: 'Bad token' }, { status: 400 })
  }
}
