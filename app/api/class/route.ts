import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/require-auth'
import { paidEventFileWhere } from '@/lib/subscription'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const where = await paidEventFileWhere(auth.user.role, Number(auth.user.id))

  const files = await prisma.classFile.findMany({
    where,
    orderBy: [{ orderIndex: 'asc' }, { uploadedAt: 'desc' }],
    select: {
      id: true,
      displayName: true,
      systemName: true,
      size: true,
      uploadedAt: true,
      views: true,
      duration: true,
      isPublic: true,
      orderIndex: true,
      eventId: true,
      event: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json(
    files.map((f) => ({ ...f, size: Number(f.size) }))
  )
}
