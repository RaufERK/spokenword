// app/api/conf-archive/[systemName]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

const CONF_ARCHIVE_DIR = path.resolve(process.cwd(), 'public/conf-archive')

export async function DELETE(req: NextRequest) {
  // Получаем systemName из url (а не из params!)
  const url = new URL(req.url)
  const parts = url.pathname.split('/')
  const systemName = decodeURIComponent(parts[parts.length - 1])

  // Авторизация
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  // Находим файл в базе
  const file = await prisma.conferenceFile.findUnique({
    where: { systemName },
  })
  if (!file)
    return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })

  // Удаляем из базы
  await prisma.conferenceFile.delete({ where: { id: file.id } })

  // Удаляем с диска
  const filePath = path.join(CONF_ARCHIVE_DIR, systemName)
  try {
    await fs.unlink(filePath)
  } catch (e) {
    console.error(e)
  }

  return NextResponse.json({ ok: true })
}
