import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { mkdir } from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import path from 'path'
import { addVideoToQueue } from '@/lib/videoQueue'
import redis from '@/lib/redis'
import busboy from 'busboy'
import { Readable } from 'stream'

// Увеличиваем лимит
export const maxDuration = 300 // 5 минут
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    // ИСПОЛЬЗУЕМ BUSBOY для обхода 10MB лимита Next.js
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({ message: 'Invalid content type' }, { status: 400 })
    }

    const nodeStream = Readable.from(req.body as any)

    return new Promise<NextResponse>(async (resolve) => {
      const bb = busboy({ 
        headers: { 'content-type': contentType },
        limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB
      })

      let packageId: number = 0
      let originalFileName = ''
      let fileSize = 0
      let tempFilePath = ''
      let fileProcessed = false

      // Текстовые поля
      bb.on('field', (fieldname, val) => {
        if (fieldname === 'packageId') {
          packageId = parseInt(val)
        }
      })

      // Обработка файлов
      bb.on('file', async (fieldname, file, info) => {
        if (fieldname !== 'file') {
          file.resume()
          return
        }

        originalFileName = info.filename
        fileProcessed = true

        // Проверка пакета
        const pkg = await prisma.contentPackage.findUnique({
          where: { id: packageId },
          include: { items: true }
        })

        if (!pkg) {
          file.resume()
          resolve(NextResponse.json({ message: 'Пакет не найден' }, { status: 404 }))
          return
        }

        // ПРОВЕРКА ДУБЛИКАТОВ через Redis + БД
        const redisKey = `upload:${packageId}:${originalFileName}`
        const existingStatus = await redis.get(redisKey)
        
        if (existingStatus) {
          const status = JSON.parse(existingStatus)
          
          if (status.status === 'processing') {
            file.resume()
            resolve(NextResponse.json({ 
              message: `Файл "${originalFileName}" уже обрабатывается. Подождите завершения.`,
              status: 'processing'
            }, { status: 409 }))
            return
          }
          
          if (status.status === 'done') {
            file.resume()
            resolve(NextResponse.json({ 
              message: `Файл "${originalFileName}" уже загружен в этот пакет.`,
              status: 'done'
            }, { status: 400 }))
            return
          }
          
          // Если status === 'error' - можно перезагрузить (продолжаем)
          if (status.status === 'error') {
            console.log(`⚠️ Повторная загрузка файла после ошибки: ${originalFileName}`)
          }
        }

        // Создаём папки
        const packageDir = path.join(process.cwd(), 'paid-content', 'packages', `package_${packageId}`)
        const tempDir = path.join(process.cwd(), 'paid-content', 'temp')
        
        if (!existsSync(packageDir)) {
          await mkdir(packageDir, { recursive: true })
        }
        if (!existsSync(tempDir)) {
          await mkdir(tempDir, { recursive: true })
        }

        // Сохраняем файл во временную папку ЧЕРЕЗ STREAMING
        tempFilePath = path.join(tempDir, `${Date.now()}_${originalFileName}`)
        
        console.log(`📥 Начинаем потоковую загрузку: ${originalFileName}`)
        
        // Создаём поток записи
        const writeStream = createWriteStream(tempFilePath)
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
          console.log(`💾 Файл сохранён: ${originalFileName} (${Math.round(bytesWritten / 1024 / 1024)}MB)`)
        })

        file.on('error', (err) => {
          console.error('❌ File stream error:', err)
          writeStream.destroy()
          resolve(NextResponse.json({ message: 'Ошибка при загрузке файла' }, { status: 500 }))
        })
      })

      // Завершение обработки
      bb.on('finish', async () => {
        if (!fileProcessed || !packageId) {
          resolve(NextResponse.json({ message: 'Файл и ID пакета обязательны' }, { status: 400 }))
          return
        }

        try {
          const pkg = await prisma.contentPackage.findUnique({
            where: { id: packageId },
            include: { items: true }
          })

          if (!pkg) {
            resolve(NextResponse.json({ message: 'Пакет не найден' }, { status: 404 }))
            return
          }

          // Проверка дубликатов в БД
          const isDuplicate = pkg.items.some(item => 
            item.originalName === originalFileName && 
            item.originalSize === fileSize
          )

          if (isDuplicate) {
            resolve(NextResponse.json({ 
              message: `Файл "${originalFileName}" уже загружен в этот пакет.` 
            }, { status: 400 }))
            return
          }

          const nextOrderIndex = Math.max(...pkg.items.map(item => item.orderIndex), 0) + 1
          const packageDir = path.join(process.cwd(), 'paid-content', 'packages', `package_${packageId}`)
          const compressedFileName = `lecture_${nextOrderIndex.toString().padStart(2, '0')}_compressed.mp4`
          const outputPath = path.join(packageDir, compressedFileName)

          // Проверяем среду
          const isProduction = process.env.NODE_ENV === 'production'
          const shouldCompress = isProduction || process.env.FORCE_COMPRESSION === 'true'

          if (!shouldCompress) {
            // Локальная разработка - копируем без сжатия
            const fileExtension = path.extname(originalFileName)
            const fallbackFileName = `lecture_${nextOrderIndex.toString().padStart(2, '0')}_original${fileExtension}`
            const fallbackPath = path.join(packageDir, fallbackFileName)
            
            await import('fs').then(fs => fs.promises.copyFile(tempFilePath, fallbackPath))
            await import('fs').then(fs => fs.promises.unlink(tempFilePath))

            const baseName = originalFileName.replace(/\.[^/.]+$/, '')
            const newItem = await prisma.packageItem.create({
              data: {
                packageId,
                title: `Лекция ${nextOrderIndex}: ${baseName}`,
                fileName: fallbackFileName,
                originalName: originalFileName,
                filePath: `/paid-content/packages/package_${packageId}/${fallbackFileName}`,
                duration: null,
                orderIndex: nextOrderIndex,
                originalSize: fileSize,
                compressedSize: fileSize
              }
            })

            resolve(NextResponse.json({
              success: true,
              item: newItem,
              warning: 'Видео загружено без сжатия (локальная разработка)',
              compressed: false
            }))
            return
          }

          // ДОБАВЛЯЕМ В ОЧЕРЕДЬ Redis (для production)
          const redisKey = `upload:${packageId}:${originalFileName}`
          const job = await addVideoToQueue({
            packageId,
            tempFilePath,
            outputPath,
            originalFileName,
            originalSize: fileSize,
            nextOrderIndex,
            compressedFileName,
            userId: parseInt(session.user.id)
          })

          // Устанавливаем статус "pending" в Redis
          await redis.set(
            redisKey,
            JSON.stringify({ 
              status: 'pending', 
              jobId: job.id,
              timestamp: Date.now() 
            }),
            'EX',
            3600
          )

          console.log(`📋 Файл добавлен в очередь: ${originalFileName} (Job ID: ${job.id})`)

          resolve(NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'Файл добавлен в очередь на обработку',
            status: 'queued'
          }))

        } catch (error) {
          console.error('❌ Processing error:', error)
          resolve(NextResponse.json({ message: 'Ошибка при обработке файла' }, { status: 500 }))
        }
      })

      bb.on('error', (err) => {
        console.error('❌ Busboy error:', err)
        resolve(NextResponse.json({ message: 'Ошибка парсинга формы' }, { status: 500 }))
      })

      // Подключаем stream к busboy
      nodeStream.pipe(bb)
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      message: 'Ошибка при загрузке файла' 
    }, { status: 500 })
  }
}
