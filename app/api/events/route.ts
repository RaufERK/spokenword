import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const events = await prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      startDate: true,
      accessDays: true,
      _count: { select: { payments: { where: { status: 'ACTIVE' } }, files: true } },
    },
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    title?: string
    type?: 'CONFERENCE' | 'CLASS'
    startDate?: string
    accessDays?: number
  }

  if (!body.title?.trim() || !body.startDate) {
    return NextResponse.json({ error: 'title и startDate обязательны' }, { status: 400 })
  }

  const event = await prisma.event.create({
    data: {
      title: body.title.trim(),
      type: body.type ?? 'CONFERENCE',
      startDate: new Date(body.startDate),
      accessDays: body.accessDays ?? 30,
    },
  })

  return NextResponse.json(event, { status: 201 })
}
