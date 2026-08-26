import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const allowedCorsOrigins = ['https://audio.spoken-word.ru']

function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin')

  if (!origin || !allowedCorsOrigins.includes(origin)) {
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function durationMinutes(durationSec: number | null) {
  if (durationSec == null || durationSec <= 0) return null
  return Math.max(1, Math.round(durationSec / 60))
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  })
}

export async function GET(req: NextRequest) {
  try {
    const lectures = await prisma.audioLecture.findMany({
      where: { isPublished: true },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        title: true,
        durationSec: true,
        systemName: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: lectures.map((lecture) => ({
          id: lecture.id,
          title: lecture.title,
          durationMinutes: durationMinutes(lecture.durationSec),
          src: `/media/library/${lecture.systemName}`,
        })),
      },
      { headers: getCorsHeaders(req) }
    )
  } catch (error) {
    console.error('Error fetching audio library:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio library' },
      { status: 500, headers: getCorsHeaders(req) }
    )
  }
}
