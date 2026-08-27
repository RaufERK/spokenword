import {
  resolvePublicBroadcast,
} from '@/lib/audio-broadcast'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const allowedCorsOrigins = ['https://audio.spoken-word.ru']

export const dynamic = 'force-dynamic'

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
    'Cache-Control': 'no-store',
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  })
}

export async function GET(req: NextRequest) {
  const headers = {
    ...getCorsHeaders(req),
    'Cache-Control': 'no-store',
  }

  try {
    const slots = await prisma.audioBroadcastSlot.findMany({
      where: { status: { in: ['SCHEDULED', 'PLAYING'] } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        lectureId: true,
        startsAt: true,
        status: true,
        announcement: true,
        lecture: { select: { durationSec: true } },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: resolvePublicBroadcast(new Date(), slots),
      },
      { headers }
    )
  } catch (error) {
    console.error('Error fetching audio broadcast:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audio broadcast' },
      { status: 500, headers }
    )
  }
}
