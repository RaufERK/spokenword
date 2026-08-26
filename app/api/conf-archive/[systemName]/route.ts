// app/api/conf-archive/[systemName]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, requireUser } from '@/lib/require-auth'
import prisma from '@/lib/prisma'
import { canAccessConferenceFile } from '@/lib/subscription'
import fs from 'fs/promises'
import { createReadStream, statSync } from 'fs'
import path from 'path'

// В production используем абсолютный путь к shared папке (избегаем symlinks из-за Turbopack)
const CONF_ARCHIVE_DIR = process.env.NODE_ENV === 'production'
  ? '/home/appuser/apps/spokenword/shared/public/conf-archive'
  : path.resolve(process.cwd(), 'public/conf-archive')

interface Props {
  params: Promise<{ systemName: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { systemName } = await params
    
    const auth = await requireUser()
    if (auth.error) return new NextResponse('Unauthorized', { status: 401 })

    const file = await prisma.conferenceFile.findUnique({
      where: { systemName }
    })

    if (!file) {
      return new NextResponse('File not found', { status: 404 })
    }

    const allowed = await canAccessConferenceFile({
      role: auth.user.role,
      userId: Number(auth.user.id),
      eventId: file.eventId,
      isPublic: file.isPublic,
    })
    if (!allowed) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Увеличиваем счетчик просмотров
    await prisma.conferenceFile.update({
      where: { id: file.id },
      data: { views: { increment: 1 } }
    })

    // Путь к файлу (systemName уже содержит .mp4)
    const filePath = path.join(CONF_ARCHIVE_DIR, systemName)

    try {
      const stat = statSync(filePath)
      const fileSize = stat.size
      const range = req.headers.get('range')

      // Range request для стриминга
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = (end - start) + 1

        const stream = createReadStream(filePath, { start, end })

        return new NextResponse(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': 'video/mp4',
            'Cache-Control': 'public, max-age=31536000'
          }
        })
      } else {
        // Полный файл
        const stream = createReadStream(filePath)

        return new NextResponse(stream as unknown as ReadableStream, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000'
          }
        })
      }

    } catch (fileError) {
      console.error('File access error:', fileError)
      return new NextResponse('File not accessible', { status: 404 })
    }

  } catch (error) {
    console.error('Conference file stream error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { systemName } = await params

  // Авторизация
  const auth = await requireStaff()
  if (auth.error) return auth.error

  const body = await req.json() as { isPublic?: boolean; eventId?: number }

  const data: { isPublic?: boolean; eventId?: number } = {}
  if (typeof body.isPublic === 'boolean') data.isPublic = body.isPublic
  if (typeof body.eventId === 'number') {
    const event = await prisma.event.findUnique({ where: { id: body.eventId } })
    if (!event) {
      return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 })
    }
    data.eventId = body.eventId
  }

  if (data.isPublic === undefined && data.eventId === undefined) {
    return NextResponse.json({ error: 'Нужен isPublic или eventId' }, { status: 400 })
  }

  const file = await prisma.conferenceFile.update({
    where: { systemName },
    data,
  })

  return NextResponse.json({ ok: true, isPublic: file.isPublic, eventId: file.eventId })
}

export async function DELETE(req: NextRequest) {
  // Получаем systemName из url (а не из params!)
  const url = new URL(req.url)
  const parts = url.pathname.split('/')
  const systemName = decodeURIComponent(parts[parts.length - 1])

  // Авторизация
  const auth = await requireStaff()
  if (auth.error) return auth.error

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
