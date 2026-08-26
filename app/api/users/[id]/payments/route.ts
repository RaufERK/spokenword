import prisma from '@/lib/prisma'
import { requireStaff } from '@/lib/require-auth'
import { computeAccessUntil, isEventPaymentActive } from '@/lib/subscription'
import { NextResponse } from 'next/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const auth = await requireStaff()
  if (auth.error) return auth.error

  const { id } = await params
  const userId = Number(id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Неверный ID' }, { status: 400 })
  }

  const rows = await prisma.userEventAccess.findMany({
    where: { userId },
    orderBy: { paymentDate: 'desc' },
    include: {
      event: { select: { id: true, title: true, type: true, startDate: true, accessDays: true } },
      admin: { select: { firstName: true, lastName: true } },
      revoker: { select: { firstName: true, lastName: true } },
    },
  })

  return NextResponse.json(rows.map((row) => {
    const accessUntil = computeAccessUntil(row.paymentDate, row.event.startDate, row.event.accessDays)
    return {
      id: row.id,
      eventId: row.eventId,
      eventTitle: row.event.title,
      eventType: row.event.type,
      paymentDate: row.paymentDate.toISOString(),
      accessUntil: accessUntil.toISOString(),
      status: row.status,
      isActiveNow: row.status === 'ACTIVE' && isEventPaymentActive(
        row.paymentDate,
        row.event.startDate,
        row.event.accessDays,
      ),
      grantedBy: `${row.admin.firstName} ${row.admin.lastName}`.trim(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
      revokedBy: row.revoker
        ? `${row.revoker.firstName} ${row.revoker.lastName}`.trim()
        : null,
    }
  }))
}
