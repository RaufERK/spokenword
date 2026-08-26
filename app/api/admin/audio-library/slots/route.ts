import { parseSlotStartsAt, slotWindow, windowsOverlap } from '@/lib/audio-broadcast'
import prisma from '@/lib/prisma'
import { requireStaff } from '@/lib/require-auth'
import { NextResponse } from 'next/server'

const ACTIVE_STATUSES = ['SCHEDULED', 'PLAYING'] as const

export async function GET() {
  const auth = await requireStaff()
  if (auth.error) return auth.error

  const slots = await prisma.audioBroadcastSlot.findMany({
    orderBy: { startsAt: 'desc' },
    take: 100,
    include: {
      lecture: {
        select: { id: true, title: true, durationSec: true },
      },
    },
  })

  return NextResponse.json({ success: true, data: slots })
}

export async function POST(req: Request) {
  const auth = await requireStaff()
  if (auth.error) return auth.error

  const body = await req.json()
  const lectureId = Number.parseInt(String(body.lectureId), 10)
  const startsAt = typeof body.startsAt === 'string' ? parseSlotStartsAt(body.startsAt) : null

  if (!Number.isInteger(lectureId) || !startsAt) {
    return NextResponse.json({ error: 'lectureId and startsAt are required' }, { status: 400 })
  }

  const lecture = await prisma.audioLecture.findUnique({
    where: { id: lectureId },
    select: { id: true, durationSec: true, isPublished: true },
  })
  if (!lecture) {
    return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
  }

  const requested = slotWindow(startsAt, lecture.durationSec)
  const existing = await prisma.audioBroadcastSlot.findMany({
    where: { status: { in: [...ACTIVE_STATUSES] } },
    include: { lecture: { select: { durationSec: true } } },
  })

  const overlaps = existing.some((slot) =>
    windowsOverlap(requested, slotWindow(slot.startsAt, slot.lecture.durationSec))
  )
  if (overlaps) {
    return NextResponse.json({ error: 'Slot overlaps another broadcast' }, { status: 409 })
  }

  const created = await prisma.audioBroadcastSlot.create({
    data: {
      lectureId,
      startsAt,
      createdBy: Number.parseInt(auth.user.id, 10),
    },
    include: {
      lecture: { select: { id: true, title: true, durationSec: true } },
    },
  })

  return NextResponse.json({ success: true, data: created })
}
