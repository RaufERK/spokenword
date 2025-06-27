import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const files = await prisma.conferenceFile.findMany({
    orderBy: { uploadedAt: 'desc' },
  })
  // Только нужные поля
  return NextResponse.json(
    files.map((f) => ({
      id: f.id,
      displayName: f.displayName,
      systemName: f.systemName,
      size: f.size,
      uploadedAt: f.uploadedAt,
    }))
  )
}
