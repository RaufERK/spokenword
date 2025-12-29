import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { mkdir } from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'

// Увеличиваем лимит для больших видеофайлов
export const maxDuration = 300 // 5 минут на выполнение
export const dynamic = 'force-dynamic'

// Папка, куда кладём файлы (на сервере!)
const ARCHIVE_DIR = path.resolve(process.cwd(), 'public/conf-archive')

export async function POST(req: NextRequest) {
  try {
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

    // Проверяем тип
    if (!file.type.startsWith('video/mp4') && !file.name.endsWith('.mp4')) {
      return NextResponse.json({ error: 'Только mp4' }, { status: 400 })
    }

    // Проверяем размер (максимум 2GB для конференций)
    const maxFileSize = 2 * 1024 * 1024 * 1024 // 2GB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { 
          error: `Файл слишком большой. Максимум: 2GB. Ваш: ${Math.round(file.size / 1024 / 1024 / 1024 * 100) / 100}GB` 
        },
        { status: 400 }
      )
    }

    // Генерируем уникальное имя
    const ext = '.mp4'
    const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
    const rand = randomBytes(3).toString('hex')
    const systemName = `${ts}_${rand}${ext}`

    // Создаём директорию если её нет
    await mkdir(ARCHIVE_DIR, { recursive: true })

    const filePath = path.join(ARCHIVE_DIR, systemName)

    console.log(`📥 Начинаем потоковую загрузку: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`)

    // Сохраняем файл на диск ЧЕРЕЗ STREAMING (для больших файлов)
    const writeStream = createWriteStream(filePath)
    const reader = file.stream().getReader()
    let bytesWritten = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Пишем кусочек
        const chunk = Buffer.from(value)
        writeStream.write(chunk)
        bytesWritten += chunk.length

        // Логируем прогресс каждые 50MB
        if (bytesWritten % (50 * 1024 * 1024) < chunk.length) {
          console.log(`📊 Загружено: ${Math.round(bytesWritten / 1024 / 1024)}MB / ${Math.round(file.size / 1024 / 1024)}MB`)
        }
      }

      // Закрываем поток
      await new Promise<void>((resolve, reject) => {
        writeStream.end((err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      console.log(`💾 Файл сохранён: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`)

    } catch (streamError) {
      // Закрываем поток при ошибке
      writeStream.destroy()
      throw streamError
    }

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

    console.log(`✅ Файл добавлен в архив конференций: ${displayName}`)

    return NextResponse.json({ ok: true, file: confFile })

  } catch (error) {
    console.error('❌ Conference upload error:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    )
  }
}
