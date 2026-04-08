import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import prisma from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = token.role as string
  const isPrivileged = ['MODERATOR', 'ADMIN', 'SUPER'].includes(role)

  if (!isPrivileged) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const { id } = await params
  const messageId = parseInt(id)

  if (isNaN(messageId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } })
  if (!message) {
    return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })
  }

  await prisma.chatMessage.delete({ where: { id: messageId } })

  return NextResponse.json({ success: true })
}
