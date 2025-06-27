// app/api/users/[id]/token/route.ts
import prisma from '@/lib/prisma'
import { encryptToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = Number(idStr)

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = encryptToken({ login: user.login, password: user.password })
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const url = `${base}/profile?token=${token}`

  return NextResponse.json({ token, url })
}
