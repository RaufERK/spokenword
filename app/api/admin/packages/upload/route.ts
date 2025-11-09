import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { addVideoToQueue } from '@/lib/videoQueue'
import redis from '@/lib/redis'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const packageId = parseInt(formData.get('packageId') as string)

    if (!file || !packageId) {
      return NextResponse.json({ 
        message: 'Файл и ID пакета обязательны' 
      }, { status: 400 })
    }

    const maxFileSize = 5 * 1024 * 1024 * 1024 // 5GB
    if (file.size > maxFileSize) {
      return NextResponse.json({ 
        message: `Файл слишком большой. Максимум: 5GB. Ваш: ${Math.round(file.size / 1024 / 1024 / 1024 * 100) / 100}GB` 
      }, { status: 400 })
    }

    const pkg = await prisma.contentPackage.findUnique({
      where: { id: packageId },
      include: { items: true }
    })

    if (!pkg) {
      return NextResponse.json({ 
        message: 'Пакет не найден' 
      }, { status: 404 })
    }

    const originalFileName = file.name

    // ПРОВЕРКА ДУБЛИКАТОВ через Redis + БД
    const redisKey = `upload:${packageId}:${originalFileName}`
    const existingStatus = await redis.get(redisKey)
    
    if (existingStatus) {
      const status = JSON.parse(existingStatus)
      
      if (status.status === 'processing') {
        return NextResponse.json({ 
          message: `Файл "${originalFileName}" уже обрабатывается. Подождите завершения.`,
          status: 'processing'
        }, { status: 409 })
      }
      
      if (status.status === 'done') {
        return NextResponse.json({ 
          message: `Файл "${originalFileName}" уже загружен в этот пакет.`,
          status: 'done'
        }, { status: 400 })
      }
      
      // Если status === 'error' - можно перезагрузить (продолжаем)
      if (status.status === 'error') {
        console.log(`⚠️ Повторная загрузка файла после ошибки: ${originalFileName}`)
      }
    }

    // Проверка в БД (на случай если Redis очистился)
    const isDuplicate = pkg.items.some(item => 
      item.originalName === originalFileName && 
      item.originalSize === file.size
    )

    if (isDuplicate) {
      return NextResponse.json({ 
        message: `Файл "${originalFileName}" уже загружен в этот пакет.` 
      }, { status: 400 })
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

    // Сохраняем файл во временную папку
    const tempFilePath = path.join(tempDir, `${Date.now()}_${originalFileName}`)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)

    console.log(`💾 Файл сохранён: ${originalFileName} (${Math.round(file.size / 1024 / 1024)}MB)`)

    const nextOrderIndex = Math.max(...pkg.items.map(item => item.orderIndex), 0) + 1
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
          originalSize: file.size,
          compressedSize: file.size
        }
      })

      return NextResponse.json({
        success: true,
        item: newItem,
        warning: 'Видео загружено без сжатия (локальная разработка)',
        compressed: false
      })
    }

    // ДОБАВЛЯЕМ В ОЧЕРЕДЬ Redis
    const job = await addVideoToQueue({
      packageId,
      tempFilePath,
      outputPath,
      originalFileName,
      originalSize: file.size,
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

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Файл добавлен в очередь на обработку',
      status: 'queued'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      message: 'Ошибка при загрузке файла' 
    }, { status: 500 })
  }
}
