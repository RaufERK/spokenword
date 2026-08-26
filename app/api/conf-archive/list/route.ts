import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/require-auth'
import { conferenceFilesVisibleTo } from '@/lib/subscription'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const where = await conferenceFilesVisibleTo(auth.user.role, Number(auth.user.id))

  const files = await prisma.conferenceFile.findMany({
    where,
    orderBy: [{ orderIndex: 'asc' }, { uploadedAt: 'desc' }],
    select: {
      id: true,
      displayName: true,
      systemName: true,
      size: true,
      uploadedAt: true,
      views: true,
      isPublic: true,
      orderIndex: true,
      eventId: true,
      event: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json(files.map((f) => ({ ...f, size: Number(f.size) })))
}
