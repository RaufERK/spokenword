import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

// Папка, куда кладём файлы (на сервере!)
const ARCHIVE_DIR = path.resolve(process.cwd(), 'public/conf-archive')

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  // Только модератор и выше!
  if (!user || !['MODERATOR', 'ADMIN', 'SUPER'].includes(user.role)) {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  // Получаем файл и "красивое имя" из FormData
  const form = await req.formData()
  const file = form.get('file') as File | null
  const displayName = form.get('displayName') as string

  if (!file || !displayName) {
    return NextResponse.json(
      { error: 'Файл и название обязательны' },
      { status: 400 }
    )
  }

  // Проверяем тип и размер
  if (!file.type.startsWith('video/mp4')) {
    return NextResponse.json({ error: 'Только mp4' }, { status: 400 })
  }
  // if (file.size > 512 * 1024 * 1024) {
  //   // 512MB, можно уменьшить
  //   return NextResponse.json({ error: 'Слишком большой файл' }, { status: 400 })
  // }

  // Генерируем уникальное имя
  const ext = '.mp4'
  const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const rand = randomBytes(3).toString('hex')
  const systemName = `${ts}_${rand}${ext}`

  // Сохраняем файл на диск
  await mkdir(ARCHIVE_DIR, { recursive: true })
  const arrayBuffer = await file.arrayBuffer()
  await writeFile(path.join(ARCHIVE_DIR, systemName), Buffer.from(arrayBuffer))

  // Сохраняем метаданные в БД
  const confFile = await prisma.conferenceFile.create({
    data: {
      displayName,
      originalName: file.name,
      systemName,
      uploadedBy: Number(user.id),
      size: file.size,
    },
  })

  return NextResponse.json({ ok: true, file: confFile })
}
