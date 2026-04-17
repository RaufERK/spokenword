import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PRIVILEGED = ['MODERATOR', 'ADMIN', 'SUPER']
const ADMIN_ROLES = ['ADMIN', 'SUPER']

// Вернуть или создать GENERAL комнату
async function ensureGeneralRoom() {
  let room = await prisma.chatRoom.findFirst({ where: { type: 'GENERAL' } })
  if (!room) room = await prisma.chatRoom.create({ data: { type: 'GENERAL' } })
  return room
}

// Найти или создать участника комнаты (для отслеживания непрочитанных)
async function ensureParticipant(roomId: number, userId: number) {
  return prisma.chatRoomParticipant.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, lastReadAt: new Date() },
    update: {},
  })
}

// GET /api/chat/rooms — список комнат для текущего пользователя
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(token.sub)
  const role = token.role as string
  const isAdmin = ADMIN_ROLES.includes(role)

  const generalRoom = await ensureGeneralRoom()
  await ensureParticipant(generalRoom.id, userId)

  // Последнее сообщение + кол-во непрочитанных
  async function roomMeta(roomId: number, participantUserId: number) {
    const [lastMsg, participant] = await Promise.all([
      prisma.chatMessage.findFirst({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        select: { text: true, createdAt: true, user: { select: { firstName: true } } },
      }),
      prisma.chatRoomParticipant.findUnique({
        where: { roomId_userId: { roomId, userId: participantUserId } },
      }),
    ])
    const unreadCount = await prisma.chatMessage.count({
      where: {
        roomId,
        userId: { not: participantUserId },
        createdAt: { gt: participant?.lastReadAt ?? new Date(0) },
      },
    })
    return { lastMsg, unreadCount }
  }

  const rooms = []

  // 1. GENERAL
  const { lastMsg: gMsg, unreadCount: gUnread } = await roomMeta(generalRoom.id, userId)
  rooms.push({
    id: generalRoom.id,
    type: 'GENERAL',
    name: 'Общий чат',
    icon: '📢',
    unreadCount: gUnread,
    lastMessage: gMsg ? { text: gMsg.text, time: gMsg.createdAt.toISOString(), authorName: gMsg.user.firstName } : null,
  })

  // 2. SUPPORT
  if (isAdmin) {
    // Все SUPPORT-комнаты — по одной строке на каждого пользователя
    const supportRooms = await prisma.chatRoom.findMany({
      where: { type: 'SUPPORT' },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    for (const sr of supportRooms) {
      const creator = sr.participants[0]?.user
      if (!creator) continue
      // Обеспечить запись участника для этого админа (для отслеживания непрочитанных)
      await ensureParticipant(sr.id, userId)
      const { lastMsg, unreadCount } = await roomMeta(sr.id, userId)
      rooms.push({
        id: sr.id,
        type: 'SUPPORT',
        name: `${creator.firstName} ${creator.lastName}`,
        icon: '🛟',
        unreadCount,
        participantId: creator.id,
        lastMessage: lastMsg ? { text: lastMsg.text, time: lastMsg.createdAt.toISOString(), authorName: lastMsg.user.firstName } : null,
      })
    }
  } else {
    // Один SUPPORT-тред для обычного пользователя (если существует)
    const mySupport = await prisma.chatRoom.findFirst({
      where: { type: 'SUPPORT', participants: { some: { userId } } },
    })
    if (mySupport) {
      const { lastMsg, unreadCount } = await roomMeta(mySupport.id, userId)
      rooms.push({
        id: mySupport.id,
        type: 'SUPPORT',
        name: 'Поддержка',
        icon: '🛟',
        unreadCount,
        lastMessage: lastMsg ? { text: lastMsg.text, time: lastMsg.createdAt.toISOString(), authorName: lastMsg.user.firstName } : null,
      })
    } else {
      // Показываем кнопку-заглушку — комната создаётся при первом сообщении
      rooms.push({ id: null, type: 'SUPPORT', name: 'Поддержка', icon: '🛟', unreadCount: 0, lastMessage: null })
    }
  }

  // 3. PRIVATE — комнаты где userId является участником
  const privateRooms = await prisma.chatRoom.findMany({
    where: { type: 'PRIVATE', participants: { some: { userId } } },
    include: {
      participants: {
        where: { userId: { not: userId } },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  for (const pr of privateRooms) {
    const other = pr.participants[0]?.user
    if (!other) continue
    const { lastMsg, unreadCount } = await roomMeta(pr.id, userId)
    rooms.push({
      id: pr.id,
      type: 'PRIVATE',
      name: `${other.firstName} ${other.lastName}`,
      icon: '💬',
      unreadCount,
      participantId: other.id,
      lastMessage: lastMsg ? { text: lastMsg.text, time: lastMsg.createdAt.toISOString(), authorName: lastMsg.user.firstName } : null,
    })
  }

  return NextResponse.json({ rooms })
}

// POST /api/chat/rooms — создать или найти комнату
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(token.sub)
  const body = await req.json() as { type: 'SUPPORT' | 'PRIVATE'; participantId?: number }

  if (body.type === 'SUPPORT') {
    // Найти или создать SUPPORT-комнату для этого пользователя
    let room = await prisma.chatRoom.findFirst({
      where: { type: 'SUPPORT', participants: { some: { userId } } },
    })
    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          type: 'SUPPORT',
          participants: { create: { userId, lastReadAt: new Date() } },
        },
      })
    }
    return NextResponse.json({ roomId: room.id })
  }

  if (body.type === 'PRIVATE' && body.participantId) {
    const otherId = body.participantId
    if (otherId === userId) return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 })

    // Найти существующую PRIVATE-комнату между двумя пользователями
    const existing = await prisma.chatRoom.findFirst({
      where: {
        type: 'PRIVATE',
        participants: { some: { userId } },
        AND: { participants: { some: { userId: otherId } } },
      },
    })
    if (existing) return NextResponse.json({ roomId: existing.id })

    // Создать новую
    const room = await prisma.chatRoom.create({
      data: {
        type: 'PRIVATE',
        participants: {
          createMany: {
            data: [
              { userId, lastReadAt: new Date() },
              { userId: otherId },
            ],
          },
        },
      },
    })
    return NextResponse.json({ roomId: room.id })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
