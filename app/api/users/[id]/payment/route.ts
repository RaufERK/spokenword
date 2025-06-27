// app/api/users/[id]/payment/route.ts
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  /* 1. берём id прямо из URL */
  // …/api/users/123/payment  →  ['','api','users','123','payment']
  const parts = new URL(request.url).pathname.split('/')
  const id = parts.at(-2) // ← '123'

  /* 2. авторизация */
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  /* 3. читаем тело запроса */
  const { paid } = (await request.json()) as { paid: boolean }

  /* 4. обновляем пользователя */
  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: { paymentDate: paid ? new Date() : null },
  })

  return NextResponse.json({ paymentDate: user.paymentDate })
}
