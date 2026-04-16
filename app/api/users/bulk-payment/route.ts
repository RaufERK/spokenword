import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { recalculateAccessUntil } from '@/lib/subscription'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

type BulkPaymentBody = {
  action: 'grant' | 'revoke'
  userIds: number[]
  eventId?: number
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as BulkPaymentBody
  const userIds = Array.from(
    new Set((body.userIds ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
  )

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'userIds обязателен' }, { status: 400 })
  }

  const adminId = Number(session.user.id)

  if (body.action === 'revoke') {
    await prisma.userEventAccess.updateMany({
      where: { userId: { in: userIds }, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedBy: adminId, revokedAt: new Date() },
    })

    const results: { id: number; accessUntil: string | null }[] = []
    for (const userId of userIds) {
      const accessUntil = await recalculateAccessUntil(userId)
      results.push({ id: userId, accessUntil: accessUntil?.toISOString() ?? null })
    }

    return NextResponse.json({ updatedCount: results.length, users: results })
  }

  // Grant
  if (!body.eventId) {
    return NextResponse.json({ error: 'eventId обязателен для выдачи доступа' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { id: body.eventId } })
  if (!event) {
    return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 })
  }

  const paymentDate = new Date()
  const results: { id: number; accessUntil: string | null }[] = []

  for (const userId of userIds) {
    await prisma.userEventAccess.upsert({
      where: { userId_eventId: { userId, eventId: event.id } },
      create: { userId, eventId: event.id, paymentDate, grantedBy: adminId, status: 'ACTIVE' },
      update: { paymentDate, grantedBy: adminId, status: 'ACTIVE', revokedBy: null, revokedAt: null },
    })
    const accessUntil = await recalculateAccessUntil(userId)
    results.push({ id: userId, accessUntil: accessUntil?.toISOString() ?? null })
  }

  return NextResponse.json({ updatedCount: results.length, users: results })
}
