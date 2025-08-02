import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// GET - получить активную ссылку
export async function GET() {
  try {
    const activeLink = await prisma.streamLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ 
      success: true, 
      data: activeLink?.url || null 
    })
  } catch (error) {
    console.error('Error fetching stream link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stream link' },
      { status: 500 }
    )
  }
}

// POST - создать/обновить ссылку (только для MODERATOR+)
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token || !['MODERATOR', 'ADMIN', 'SUPER'].includes(token.role as string)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      )
    }

    // Деактивировать все предыдущие ссылки
    await prisma.streamLink.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Создать новую активную ссылку
    const newLink = await prisma.streamLink.create({
      data: {
        url: url.trim(),
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