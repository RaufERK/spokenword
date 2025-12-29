import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { mkdir } from 'fs/promises'
import { existsSync, createWriteStream } from 'fs'
import path from 'path'
import { addVideoToQueue } from '@/lib/videoQueue'
import redis from '@/lib/redis'
import busboy from 'busboy'

// КРИТИЧНО! Отключаем встроенный bodyParser Next.js
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    sizeLimit: '5gb',
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ message: 'Invalid content type' })
    }

    return new Promise<void>(async (resolve) => {
      const bb = busboy({
        headers: req.headers,
        limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
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
          res.status(404).json({ message: 'Пакет не найден' })
          resolve()
          return
        }

        // ПРОВЕРКА ДУБЛИКАТОВ
        const redisKey = `upload:${packageId}:${originalFileName}`
        const existingStatus = await redis.get(redisKey)
        
        if (existingStatus) {
          const status = JSON.parse(existingStatus)
          
          if (status.status === 'processing') {
            file.resume()
            res.status(409).json({ 
              message: `Файл "${originalFileName}" уже обрабатывается.`,
              status: 'processing'
            })
            resolve()
            return
          }
          
          if (status.status === 'done') {
            file.resume()
            res.status(400).json({ 
              message: `Файл "${originalFileName}" уже загружен.`,
              status: 'done'
            })
            resolve()
            return
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

        tempFilePath = path.join(tempDir, `${Date.now()}_${originalFileName}`)
        
        console.log(`📥 [Pages API] Начинаем потоковую загрузку: ${originalFileName}`)
        
        const writeStream = createWriteStream(tempFilePath)
        let bytesWritten = 0

        file.on('data', (chunk: Buffer) => {
          writeStream.write(chunk)
          bytesWritten += chunk.length
          fileSize = bytesWritten

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
          res.status(500).json({ message: 'Ошибка при загрузке файла' })
          resolve()
        })
      })

      // Завершение
      bb.on('finish', async () => {
        if (!fileProcessed || !packageId) {
          res.status(400).json({ message: 'Файл и ID пакета обязательны' })
          resolve()
          return
        }

        try {
          const pkg = await prisma.contentPackage.findUnique({
            where: { id: packageId },
            include: { items: true }
          })

          if (!pkg) {
            res.status(404).json({ message: 'Пакет не найден' })
            resolve()
            return
          }

          const isDuplicate = pkg.items.some(item => 
            item.originalName === originalFileName && 
            item.originalSize === fileSize
          )

          if (isDuplicate) {
            res.status(400).json({ 
              message: `Файл "${originalFileName}" уже загружен в этот пакет.` 
            })
            resolve()
            return
          }

          const nextOrderIndex = Math.max(...pkg.items.map(item => item.orderIndex), 0) + 1
          const packageDir = path.join(process.cwd(), 'paid-content', 'packages', `package_${packageId}`)
          const compressedFileName = `lecture_${nextOrderIndex.toString().padStart(2, '0')}_compressed.mp4`
          const outputPath = path.join(packageDir, compressedFileName)

          const isProduction = process.env.NODE_ENV === 'production'
          const shouldCompress = isProduction || process.env.FORCE_COMPRESSION === 'true'

          if (!shouldCompress) {
            // Dev: без сжатия
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

            res.status(200).json({
              success: true,
              item: newItem,
              warning: 'Видео загружено без сжатия (локальная разработка)',
              compressed: false
            })
            resolve()
            return
          }

          // Production: с воркером
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

          console.log(`📋 [Pages API] Файл добавлен в очередь: ${originalFileName} (Job ID: ${job.id})`)

          res.status(200).json({
            success: true,
            jobId: job.id,
            message: 'Файл добавлен в очередь на обработку',
            status: 'queued'
          })
          resolve()

        } catch (error) {
          console.error('❌ Processing error:', error)
          res.status(500).json({ message: 'Ошибка при обработке файла' })
          resolve()
        }
      })

      bb.on('error', (err) => {
        console.error('❌ Busboy error:', err)
        res.status(500).json({ message: 'Ошибка парсинга формы' })
        resolve()
      })

      req.pipe(bb)
    })

  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке файла' })
  }
}

