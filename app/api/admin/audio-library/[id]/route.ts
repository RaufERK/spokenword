import { authOptions } from '@/lib/auth'
import { removeAudioLibraryFile } from '@/lib/audio-library'
import prisma from '@/lib/prisma'
import { isStaffRole } from '@/lib/roles'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idRaw } = await params
  const id = Number.parseInt(idRaw, 10)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const body = await req.json()
  const data: {
    title?: string
    year?: number | null
    description?: string | null
    isPublished?: boolean
    categories?: { set: { id: number }[] }
  } = {}

  if (typeof body.title === 'string' && body.title.trim()) {
    data.title = body.title.trim()
  }
  if (body.year === null || body.year === '') {
    data.year = null
  } else if (typeof body.year === 'number' || typeof body.year === 'string') {
    const year = Number.parseInt(String(body.year), 10)
    data.year = Number.isInteger(year) ? year : null
  }
  if (body.description === null) {
    data.description = null
  } else if (typeof body.description === 'string') {
    data.description = body.description.trim() || null
  }
  if (typeof body.isPublished === 'boolean') {
    data.isPublished = body.isPublished
  }
  if (Array.isArray(body.categoryIds)) {
    const categoryIds = body.categoryIds
      .map((value: unknown) => Number.parseInt(String(value), 10))
      .filter((value: number) => Number.isInteger(value))
    data.categories = { set: categoryIds.map((categoryId: number) => ({ id: categoryId })) }
  }

  const lecture = await prisma.audioLecture.update({
    where: { id },
    data,
    include: { categories: { select: { id: true, name: true, slug: true } } },
  })

  return NextResponse.json({
    success: true,
    data: { ...lecture, size: Number(lecture.size) },
  })
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idRaw } = await params
  const id = Number.parseInt(idRaw, 10)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const activeSlots = await prisma.audioBroadcastSlot.count({
    where: { lectureId: id, status: { in: ['SCHEDULED', 'PLAYING'] } },
  })
  if (activeSlots > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a lecture with an upcoming or playing broadcast' },
      { status: 409 }
    )
  }

  const lecture = await prisma.audioLecture.findUnique({
    where: { id },
    select: { systemName: true },
  })
  if (!lecture) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.audioBroadcastSlot.deleteMany({ where: { lectureId: id } })
  await prisma.audioLecture.delete({ where: { id } })
  await removeAudioLibraryFile(lecture.systemName)

  return NextResponse.json({ success: true })
}
