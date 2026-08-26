import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/require-auth'
import { isStaffRole } from '@/lib/roles'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const files = await prisma.conferenceFile.findMany({
    where: isStaffRole(auth.user.role) ? {} : { isPublic: true },
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
    },
  })

  return NextResponse.json(files.map((f) => ({ ...f, size: Number(f.size) })))
}
