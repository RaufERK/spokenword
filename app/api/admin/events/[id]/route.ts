import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  const eventId = Number(id)
  if (isNaN(eventId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json() as {
    title?: string
    type?: 'CONFERENCE' | 'CLASS'
    startDate?: string
    accessDays?: number
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(body.title?.trim() && { title: body.title.trim() }),
      ...(body.type && { type: body.type }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.accessDays !== undefined && { accessDays: body.accessDays }),
    },
  })

  return NextResponse.json({
    ...event,
    startDate: event.startDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
  })
}
