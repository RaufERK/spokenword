import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeAccessUntil } from '@/lib/subscription'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/')
  const userId = Number(parts.at(-2))

  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as {
    revoke?: boolean
    eventTitle?: string
    eventType?: 'CONFERENCE' | 'CLASS'
    eventStartDate?: string
    paymentDate?: string
  }

  // --- Отзыв доступа ---
  if (body.revoke) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { accessUntil: null, paymentDate: null },
    })
    return NextResponse.json({ accessUntil: null, paymentDate: null })
  }

  // --- Выдача доступа ---
  const { eventTitle, eventType = 'CONFERENCE', eventStartDate, paymentDate: paymentDateStr } = body

  if (!eventTitle || !eventStartDate) {
    return NextResponse.json({ error: 'Необходимы eventTitle и eventStartDate' }, { status: 400 })
  }

  const eventStart = new Date(eventStartDate)
  const paymentDate = paymentDateStr ? new Date(paymentDateStr) : new Date()
  const accessUntil = computeAccessUntil(paymentDate, eventStart)
  const adminId = Number(session.user.id)

  // Найти или создать мероприятие по заголовку + дате
  let event = await prisma.event.findFirst({
    where: { title: eventTitle, startDate: eventStart },
  })
  if (!event) {
    event = await prisma.event.create({
      data: { title: eventTitle, type: eventType, startDate: eventStart },
    })
  }

  // Создать или обновить запись о доступе
  await prisma.userEventAccess.upsert({
    where: { userId_eventId: { userId, eventId: event.id } },
    create: { userId, eventId: event.id, paymentDate, grantedBy: adminId },
    update: { paymentDate, grantedBy: adminId },
  })

  // Обновить User: если новый accessUntil позже текущего — обновляем
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessUntil: true },
  })
  const shouldUpdate = !currentUser?.accessUntil || accessUntil > currentUser.accessUntil

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      paymentDate,
      ...(shouldUpdate ? { accessUntil } : {}),
    },
  })

  return NextResponse.json({
    paymentDate: user.paymentDate,
    accessUntil: user.accessUntil,
  })
}
