import { authOptions } from '@/lib/auth'
import { generateNumericPassword } from '@/lib/password'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = Number(session.user.id)
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const password = generateNumericPassword()
  const user = await prisma.user.update({
    where: { id: userId },
    data: { password },
    select: { id: true, login: true },
  })

  return NextResponse.json({
    id: user.id,
    login: user.login,
    password,
  })
}
