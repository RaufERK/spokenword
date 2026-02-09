// app/api/conf-archive/list/route.ts

import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const files = await prisma.conferenceFile.findMany({
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      displayName: true,
      systemName: true,
      size: true,
      uploadedAt: true,
      views: true,
      isPublic: true,
    },
  })
  
  // Convert BigInt to Number for JSON serialization
  const filesWithConvertedSize = files.map(file => ({
    ...file,
    size: Number(file.size),
  }))
  
  return NextResponse.json(filesWithConvertedSize)
}
