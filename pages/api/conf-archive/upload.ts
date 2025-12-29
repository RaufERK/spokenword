import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { mkdir } from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import busboy from 'busboy'

// КРИТИЧНО! Отключаем встроенный bodyParser Next.js
export const config = {
  api: {
    bodyParser: false, // Отключаем bodyParser чтобы читать RAW stream
    responseLimit: false,
    sizeLimit: '5gb', // Устанавливаем лимит 5GB
  },
}

const ARCHIVE_DIR = path.resolve(process.cwd(), 'public/conf-archive')

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Проверка авторизации
    const session = await getServerSession(req, res, authOptions)
    const user = session?.user

    if (!user || !['MODERATOR', 'ADMIN', 'SUPER'].includes(user.role)) {
      return res.status(403).json({ error: 'Нет доступа' })
    }

    // Создаём директорию
    await mkdir(ARCHIVE_DIR, { recursive: true })

    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    return new Promise<void>((resolve) => {
      const bb = busboy({
        headers: req.headers,
        limits: {
          fileSize: 5 * 1024 * 1024 * 1024, // 5GB
        },
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
          res.status(400).json({ error: 'Только mp4' })
          resolve()
          return
        }

        // Генерируем уникальное имя
        const ext = '.mp4'
        const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
        const rand = randomBytes(3).toString('hex')
        systemName = `${ts}_${rand}${ext}`
        filePath = path.join(ARCHIVE_DIR, systemName)

        console.log(`📥 [Pages API] Начинаем потоковую загрузку: ${fileName}`)

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
          res.status(500).json({ error: 'Ошибка при загрузке файла' })
          resolve()
        })
      })

      // Завершение обработки
      bb.on('finish', async () => {
        if (!fileProcessed || !displayName) {
          res.status(400).json({ error: 'Файл и название обязательны' })
          resolve()
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

          console.log(`✅ [Pages API] Файл добавлен в архив конференций: ${displayName}`)
          res.status(200).json({ ok: true, file: confFile })
          resolve()

        } catch (error) {
          console.error('❌ Database error:', error)
          res.status(500).json({ error: 'Ошибка при сохранении в БД' })
          resolve()
        }
      })

      bb.on('error', (err) => {
        console.error('❌ Busboy error:', err)
        res.status(500).json({ error: 'Ошибка парсинга формы' })
        resolve()
      })

      // Подключаем stream к busboy
      req.pipe(bb)
    })

  } catch (error) {
    console.error('❌ Conference upload error:', error)
    return res.status(500).json({ error: 'Ошибка при загрузке файла' })
  }
}

