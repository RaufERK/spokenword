import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const LINK_REGEX = /https?:\/\/[^\s]+/g

function containsLink(text: string): boolean {
  return LINK_REGEX.test(text)
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const messages = await prisma.chatMessage.findMany({
    take: limit,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      text: true,
      link: true,
      reactions: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, data: messages })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { text, link } = body as { text: string; link?: string }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 })
  }

  if (text.trim().length > 1000) {
    return NextResponse.json({ error: 'Сообщение слишком длинное (макс. 1000 символов)' }, { status: 400 })
  }

  const role = token.role as string
  const isPrivileged = ['MODERATOR', 'ADMIN', 'SUPER'].includes(role)

  // Обычным пользователям нельзя постить ссылки
  if (!isPrivileged) {
    if (containsLink(text)) {
      return NextResponse.json({ error: 'Ссылки могут публиковать только администраторы' }, { status: 403 })
    }
    if (link) {
      return NextResponse.json({ error: 'Ссылки могут публиковать только администраторы' }, { status: 403 })
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      userId: Number(token.sub),
      text: text.trim(),
      link: isPrivileged && link ? link.trim() : null,
    },
    select: {
      id: true,
      text: true,
      link: true,
      reactions: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, data: message })
}
