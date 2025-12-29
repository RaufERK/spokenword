import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { mkdir } from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import busboy from 'busboy'
import { Readable } from 'stream'

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

    // Создаём директорию если её нет
    await mkdir(ARCHIVE_DIR, { recursive: true })

    // ИСПОЛЬЗУЕМ BUSBOY для обхода 10MB лимита Next.js
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Конвертируем Web ReadableStream в Node.js Readable stream
    const nodeStream = Readable.from(req.body as any)

    return new Promise<NextResponse>((resolve) => {
      const bb = busboy({ 
        headers: { 
          'content-type': contentType 
        },
        limits: {
          fileSize: 5 * 1024 * 1024 * 1024, // 5GB максимум
        }
      })

      let displayName = ''
      let fileProcessed = false
      let fileName = ''
      let fileSize = 0
      let systemName = ''
      let filePath = ''

      // Обработка текстовых полей
      bb.on('field', (fieldname, val) => {
        if (fieldname === 'displayName') {
          displayName = val
        }
      })

      // Обработка файлов
      bb.on('file', async (fieldname, file, info) => {
        if (fieldname !== 'file') {
          file.resume()
          return
        }

        fileName = info.filename
        fileProcessed = true

        // Проверяем расширение
        if (!fileName.endsWith('.mp4')) {
          file.resume()
          resolve(NextResponse.json({ error: 'Только mp4' }, { status: 400 }))
          return
        }

        // Генерируем уникальное имя
        const ext = '.mp4'
        const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
        const rand = randomBytes(3).toString('hex')
        systemName = `${ts}_${rand}${ext}`
        filePath = path.join(ARCHIVE_DIR, systemName)

        console.log(`📥 Начинаем потоковую загрузку: ${fileName}`)

        // Сохраняем файл на диск
        const writeStream = createWriteStream(filePath)
        let bytesWritten = 0

        file.on('data', (chunk: Buffer) => {
          writeStream.write(chunk)
          bytesWritten += chunk.length
          fileSize = bytesWritten

          // Логируем прогресс каждые 50MB
          if (bytesWritten % (50 * 1024 * 1024) < chunk.length) {
            console.log(`📊 Загружено: ${Math.round(bytesWritten / 1024 / 1024)}MB`)
          }
        })

        file.on('end', () => {
          writeStream.end()
          console.log(`💾 Файл сохранён: ${fileName} (${Math.round(bytesWritten / 1024 / 1024)}MB)`)
        })

        file.on('error', (err) => {
          console.error('❌ File stream error:', err)
          writeStream.destroy()
          resolve(NextResponse.json({ error: 'Ошибка при загрузке файла' }, { status: 500 }))
        })
      })

      // Завершение обработки
      bb.on('finish', async () => {
        if (!fileProcessed || !displayName) {
          resolve(NextResponse.json(
            { error: 'Файл и название обязательны' },
            { status: 400 }
          ))
          return
        }

        try {
          // Сохраняем метаданные в БД
          const confFile = await prisma.conferenceFile.create({
            data: {
              displayName,
              originalName: fileName,
              systemName,
              uploadedBy: Number(user.id),
              size: fileSize,
            },
          })

          console.log(`✅ Файл добавлен в архив конференций: ${displayName}`)
          resolve(NextResponse.json({ ok: true, file: confFile }))

        } catch (error) {
          console.error('❌ Database error:', error)
          resolve(NextResponse.json(
            { error: 'Ошибка при сохранении в БД' },
            { status: 500 }
          ))
        }
      })

      bb.on('error', (err) => {
        console.error('❌ Busboy error:', err)
        resolve(NextResponse.json({ error: 'Ошибка парсинга формы' }, { status: 500 }))
      })

      // Подключаем stream к busboy
      nodeStream.pipe(bb)
    })

  } catch (error) {
    console.error('❌ Conference upload error:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    )
  }
}
