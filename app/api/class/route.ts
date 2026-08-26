import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isStaffRole } from '@/lib/roles'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const files = await prisma.classFile.findMany({
    where: isStaffRole(session.user.role) ? {} : { isPublic: true },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      displayName: true,
      systemName: true,
      size: true,
      uploadedAt: true,
      views: true,
      duration: true,
      isPublic: true,
    },
  })

  return NextResponse.json(
    files.map((f) => ({ ...f, size: Number(f.size) }))
  )
}
