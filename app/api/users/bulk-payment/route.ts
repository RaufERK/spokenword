import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeAccessUntil } from '@/lib/subscription'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

type EventType = 'CONFERENCE' | 'CLASS'

type BulkPaymentBody = {
  action: 'grant' | 'revoke'
  userIds: number[]
  eventTitle?: string
  eventType?: EventType
  eventStartDate?: string
  paymentDate?: string
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as BulkPaymentBody
  const userIds = Array.from(new Set((body.userIds ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0)))

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'userIds обязателен' }, { status: 400 })
  }

  if (body.action === 'revoke') {
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { accessUntil: null, paymentDate: null },
    })

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, paymentDate: true, accessUntil: true },
    })

    return NextResponse.json({ updatedCount: users.length, users })
  }

  const { eventTitle, eventType = 'CONFERENCE', eventStartDate, paymentDate: paymentDateStr } = body
  if (!eventTitle || !eventStartDate) {
    return NextResponse.json({ error: 'Необходимы eventTitle и eventStartDate' }, { status: 400 })
  }

  const eventStart = new Date(eventStartDate)
  if (Number.isNaN(eventStart.getTime())) {
    return NextResponse.json({ error: 'Некорректная дата eventStartDate' }, { status: 400 })
  }

  const paymentDate = paymentDateStr ? new Date(paymentDateStr) : new Date()
  if (Number.isNaN(paymentDate.getTime())) {
    return NextResponse.json({ error: 'Некорректная дата paymentDate' }, { status: 400 })
  }

  const accessUntil = computeAccessUntil(paymentDate, eventStart)
  const adminId = Number(session.user.id)

  let event = await prisma.event.findFirst({
    where: { title: eventTitle, startDate: eventStart },
  })
  if (!event) {
    event = await prisma.event.create({
      data: { title: eventTitle, type: eventType as EventType, startDate: eventStart },
    })
  }

  const users = await prisma.$transaction(async (tx) => {
    const currentUsers = await tx.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, accessUntil: true },
    })
    const currentMap = new Map(currentUsers.map((u) => [u.id, u.accessUntil]))

    for (const userId of userIds) {
      await tx.userEventAccess.upsert({
        where: { userId_eventId: { userId, eventId: event.id } },
        create: { userId, eventId: event.id, paymentDate, grantedBy: adminId },
        update: { paymentDate, grantedBy: adminId },
      })

      const currentAccessUntil = currentMap.get(userId) ?? null
      const shouldUpdateAccess = !currentAccessUntil || accessUntil > currentAccessUntil

      await tx.user.update({
        where: { id: userId },
        data: {
          paymentDate,
          ...(shouldUpdateAccess ? { accessUntil } : {}),
        },
      })
    }

    return tx.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, paymentDate: true, accessUntil: true },
    })
  })

  return NextResponse.json({ updatedCount: users.length, users })
}
