import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

const allowedCorsOrigins = ['https://audio.spoken-word.ru']

function getCorsHeaders(req: NextRequest) {
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

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  })
}

// GET - получить активные ссылки
export async function GET(req: NextRequest) {
  try {
    const activeLink = await prisma.streamLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        youtubeUrl: activeLink?.youtubeUrl || null,
        rutubeUrl: activeLink?.rutubeUrl || null,
      }
    }, {
      headers: getCorsHeaders(req),
    })
  } catch (error) {
    console.error('Error fetching stream link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stream link' },
      { status: 500, headers: getCorsHeaders(req) }
    )
  }
}

// POST - создать/обновить ссылки (только для MODERATOR+)
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token || !['MODERATOR', 'ADMIN', 'SUPER'].includes(token.role as string)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { youtubeUrl, rutubeUrl } = await req.json()

    // Деактивировать все предыдущие ссылки
    await prisma.streamLink.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Создать новую активную запись
    const newLink = await prisma.streamLink.create({
      data: {
        youtubeUrl: youtubeUrl?.trim() || null,
        rutubeUrl: rutubeUrl?.trim() || null,
        isActive: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: newLink 
    })
  } catch (error) {
    console.error('Error updating stream link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update stream link' },
      { status: 500 }
    )
  }
}
