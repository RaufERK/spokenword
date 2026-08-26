import { generateNumericPassword, hashPassword } from '@/lib/password'
import { requireUser } from '@/lib/require-auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const userId = Number(auth.user.id)
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const password = generateNumericPassword()
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      password: await hashPassword(password),
      tokenVersion: { increment: 1 },
    },
    select: { id: true, login: true },
  })

  return NextResponse.json({
    id: user.id,
    login: user.login,
    password,
  })
}
