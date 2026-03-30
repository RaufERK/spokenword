import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'
import { isSubscriptionActive } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const role = token.role as string
  const hasClassAccess =
    ['MODERATOR', 'ADMIN', 'SUPER'].includes(role) ||
    isSubscriptionActive(token.paymentDate as string | null)

  if (!hasClassAccess) {
    return NextResponse.json({ success: false, error: 'Нет доступа' }, { status: 403 })
  }

  try {
    const activeLink = await prisma.classStreamLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        youtubeUrl: activeLink?.youtubeUrl || null,
        rutubeUrl: activeLink?.rutubeUrl || null,
      },
    })
  } catch (error) {
    console.error('Error fetching class stream link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stream link' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token || !['MODERATOR', 'ADMIN', 'SUPER'].includes(token.role as string)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const { youtubeUrl, rutubeUrl } = await req.json()

    await prisma.classStreamLink.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    const newLink = await prisma.classStreamLink.create({
      data: {
        youtubeUrl: youtubeUrl?.trim() || null,
        rutubeUrl: rutubeUrl?.trim() || null,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: newLink })
  } catch (error) {
    console.error('Error updating class stream link:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update stream link' },
      { status: 500 }
    )
  }
}
