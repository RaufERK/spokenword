import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { recalculateAccessUntil } from '@/lib/subscription'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/')
  const userId = Number(parts.at(-2))

  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as { action?: 'grant' | 'revoke'; eventId?: number }
  const adminId = Number(session.user.id)

  if (body.action === 'revoke') {
    await prisma.userEventAccess.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedBy: adminId, revokedAt: new Date() },
    })
    await recalculateAccessUntil(userId)
    return NextResponse.json({ accessUntil: null })
  }

  // Grant
  if (!body.eventId) {
    return NextResponse.json({ error: 'eventId обязателен' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { id: body.eventId } })
  if (!event) {
    return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 })
  }

  const paymentDate = new Date()

  await prisma.userEventAccess.upsert({
    where: { userId_eventId: { userId, eventId: event.id } },
    create: { userId, eventId: event.id, paymentDate, grantedBy: adminId, status: 'ACTIVE' },
    update: { paymentDate, grantedBy: adminId, status: 'ACTIVE', revokedBy: null, revokedAt: null },
  })

  const accessUntil = await recalculateAccessUntil(userId)

  return NextResponse.json({
    accessUntil: accessUntil?.toISOString() ?? null,
    event: { id: event.id, title: event.title },
  })
}
