import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const files = await prisma.classFile.findMany({
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      displayName: true,
      systemName: true,
      size: true,
      uploadedAt: true,
      views: true,
      duration: true,
    },
  })

  return NextResponse.json(
    files.map((f) => ({ ...f, size: Number(f.size) }))
  )
}
