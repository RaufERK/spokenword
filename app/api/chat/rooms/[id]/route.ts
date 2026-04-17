import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['ADMIN', 'SUPER']
const PRIVILEGED = ['MODERATOR', 'ADMIN', 'SUPER']

async function checkAccess(roomId: number, userId: number, role: string): Promise<boolean> {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } })
  if (!room) return false
  if (room.type === 'GENERAL') return true
  if (room.type === 'SUPPORT') {
    if (ADMIN_ROLES.includes(role)) return true
    // Пользователь — только свой тред
    const p = await prisma.chatRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    return !!p
  }
  if (room.type === 'PRIVATE') {
    const p = await prisma.chatRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    return !!p
  }
  return false
}

// GET /api/chat/rooms/[id] — сообщения комнаты + обновляем lastReadAt
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const roomId = Number(id)
  const userId = Number(token.sub)
  const role = token.role as string

  if (!(await checkAccess(roomId, userId, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Обновить lastReadAt
  await prisma.chatRoomParticipant.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  })

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '100'), 200)

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    take: limit,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      text: true,
      link: true,
      reactions: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })

  return NextResponse.json({ messages })
}

// POST /api/chat/rooms/[id] — отправить сообщение
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const roomId = Number(id)
  const userId = Number(token.sub)
  const role = token.role as string

  if (!(await checkAccess(roomId, userId, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { text: string; link?: string }
  const text = body.text?.trim()
  if (!text || text.length === 0) return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 })
  if (text.length > 1000) return NextResponse.json({ error: 'Слишком длинное сообщение' }, { status: 400 })

  // Ссылки только для привилегированных в GENERAL и SUPPORT (в личке — всем)
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } })
  const isPrivileged = PRIVILEGED.includes(role)
  if (body.link && room?.type !== 'PRIVATE' && !isPrivileged) {
    return NextResponse.json({ error: 'Ссылки только для администраторов' }, { status: 403 })
  }
  if (/https?:\/\//.test(text) && room?.type !== 'PRIVATE' && !isPrivileged) {
    return NextResponse.json({ error: 'Ссылки в тексте только для администраторов' }, { status: 403 })
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      userId,
      text,
      link: (isPrivileged || room?.type === 'PRIVATE') && body.link ? body.link.trim() : null,
    },
    select: {
      id: true,
      text: true,
      link: true,
      reactions: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })

  // Обновить updatedAt у комнаты (для сортировки в sidebar)
  await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } })

  // Если пользователь пишет в SUPPORT — убедиться что он participant
  if (room?.type === 'SUPPORT') {
    await prisma.chatRoomParticipant.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    })
  }

  return NextResponse.json({ message })
}
