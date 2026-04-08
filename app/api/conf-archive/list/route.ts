// app/api/conf-archive/list/route.ts

import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const files = await prisma.conferenceFile.findMany({
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

  return NextResponse.json(files.map(f => ({ ...f, size: Number(f.size) })))
}
