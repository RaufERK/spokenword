// app/api/profile-from-token/route.ts
import prisma from '@/lib/prisma'
import { decryptToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  try {
    const { login, password } = decryptToken(token)
    const user = await prisma.user.findUnique({
      where: { login, password }
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      login: user.login,
      role: user.role,
      password: user.password
    })
  } catch {
    return NextResponse.json({ error: 'Bad token' }, { status: 400 })
  }
}
