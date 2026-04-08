import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

type Reactions = Record<string, number[]>

const REACTION_TYPES = ['like', 'heart', 'smile', 'fire', 'clap'] as const
type ReactionType = typeof REACTION_TYPES[number]

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = token.role as string
  if (!['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const { id } = await params
  const messageId = parseInt(id)
  if (isNaN(messageId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } })
  if (!message) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  await prisma.chatMessage.delete({ where: { id: messageId } })
  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const messageId = parseInt(id)
  if (isNaN(messageId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const type = body.type as ReactionType
  if (!REACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 })
  }

  const userId = Number(token.sub)

  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } })
  if (!message) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  let reactions: Reactions = {}
  try {
    reactions = JSON.parse(message.reactions) as Reactions
  } catch {}

  if (!reactions[type]) reactions[type] = []

  const idx = reactions[type].indexOf(userId)
  if (idx >= 0) {
    // toggle off
    reactions[type].splice(idx, 1)
    if (reactions[type].length === 0) delete reactions[type]
  } else {
    // remove user from all other reactions first (one reaction per user)
    for (const key of REACTION_TYPES) {
      if (key !== type && reactions[key]) {
        reactions[key] = reactions[key].filter((uid) => uid !== userId)
        if (reactions[key].length === 0) delete reactions[key]
      }
    }
    reactions[type].push(userId)
  }

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(reactions) },
  })

  return NextResponse.json({ success: true, reactions })
}
