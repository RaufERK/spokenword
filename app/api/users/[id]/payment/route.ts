import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-auth'
import { recalculateAccessUntil } from '@/lib/subscription'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/')
  const userId = Number(parts.at(-2))

  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const body = await request.json() as { action?: 'grant' | 'revoke'; eventId?: number }
  const adminId = Number(auth.user.id)

  if (body.action === 'revoke') {
    await prisma.userEventAccess.updateMany({
      where: body.eventId
        ? { userId, eventId: body.eventId, status: 'ACTIVE' }
        : { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedBy: adminId, revokedAt: new Date() },
    })
    const accessUntil = await recalculateAccessUntil(userId)
    return NextResponse.json({ accessUntil: accessUntil?.toISOString() ?? null })
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
