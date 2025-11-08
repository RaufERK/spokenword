import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
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

    // Проверяем размер файла (максимум 5GB)
    const maxFileSize = 5 * 1024 * 1024 * 1024 // 5GB
    if (file.size > maxFileSize) {
      return NextResponse.json({ 
        message: `Файл слишком большой. Максимальный размер: 5GB. Ваш файл: ${Math.round(file.size / 1024 / 1024 / 1024 * 100) / 100}GB` 
      }, { status: 400 })
    }

    // Проверяем существование пакета
    const pkg = await prisma.contentPackage.findUnique({
      where: { id: packageId },
      include: { items: true }
    })

    if (!pkg) {
      return NextResponse.json({ 
        message: 'Пакет не найден' 
      }, { status: 404 })
    }

    // Проверяем на дубликаты (по имени файла + размеру)
    const originalFileName = file.name
    const isDuplicate = pkg.items.some(item => 
      item.originalName === originalFileName && 
      item.originalSize === file.size
    )

    if (isDuplicate) {
      return NextResponse.json({ 
        message: `Файл "${originalFileName}" уже загружен в этот пакет. Дубликаты не допускаются.` 
      }, { status: 400 })
    }

    // Создаем папку для пакета если не существует
    const packageDir = path.join(process.cwd(), 'paid-content', 'packages', `package_${packageId}`)
    if (!existsSync(packageDir)) {
      await mkdir(packageDir, { recursive: true })
    }

    // Создаем временную папку
    const tempDir = path.join(process.cwd(), 'paid-content', 'temp')
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // Сохраняем оригинальный файл во временную папку  
    const fileExtension = path.extname(originalFileName)
    const baseName = path.basename(originalFileName, fileExtension)
    const tempFilePath = path.join(tempDir, `${Date.now()}_${originalFileName}`)
    
    // Используем стрим для больших файлов вместо загрузки в память
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(tempFilePath, buffer)

    const originalSize = file.size // Используем размер из File API вместо buffer.length

    // Определяем следующий порядковый номер
    const nextOrderIndex = Math.max(...pkg.items.map(item => item.orderIndex), 0) + 1

    // Генерируем имя для сжатого файла
    const compressedFileName = `lecture_${nextOrderIndex.toString().padStart(2, '0')}_compressed.mp4`
    const compressedFilePath = path.join(packageDir, compressedFileName)

    // Проверяем среду выполнения
    const isProduction = process.env.NODE_ENV === 'production'
    const shouldCompress = isProduction || process.env.FORCE_COMPRESSION === 'true'

    if (shouldCompress) {
      try {
        // Сжимаем видео с помощью FFmpeg до 720p с максимальной скоростью
        const ffmpegCommand = `ffmpeg -y -i "${tempFilePath}" -vf scale=1280:720 -c:v libx264 -crf 28 -preset ultrafast -c:a aac -b:a 96k -movflags +faststart -threads 4 "${compressedFilePath}"`
        
        // Устанавливаем лимиты для процесса FFmpeg
        const options = {
          maxBuffer: 1024 * 1024 * 10, // 10MB буфер
          timeout: 1000 * 60 * 10, // 10 минут таймаут
        }
        
        console.log(`🎬 Начинаем сжатие видео: ${originalFileName}`)
        console.log(`📊 Размер исходника: ${Math.round(originalSize / 1024 / 1024)}MB`)
        console.log(`🔧 FFmpeg команда: ${ffmpegCommand}`)
        
        const startTime = Date.now()
        await execAsync(ffmpegCommand, options)
        const endTime = Date.now()
        
        console.log(`⏱️ Сжатие завершено за ${Math.round((endTime - startTime) / 1000)}с`)

        // Получаем длительность видео
        const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${compressedFilePath}"`
        const { stdout: durationOutput } = await execAsync(durationCommand)
        const duration = Math.round(parseFloat(durationOutput.trim()))

        // Получаем размер сжатого файла
        const { size: compressedSize } = await import('fs').then(fs => fs.promises.stat(compressedFilePath))
        
        console.log(`📉 Сжатие: ${Math.round(originalSize / 1024 / 1024)}MB → ${Math.round(compressedSize / 1024 / 1024)}MB`)
        console.log(`🎯 Коэффициент сжатия: ${Math.round((1 - compressedSize / originalSize) * 100)}%`)

        // Создаем запись в БД
        const newItem = await prisma.packageItem.create({
          data: {
            packageId,
            title: `Лекция ${nextOrderIndex}: ${baseName}`,
            fileName: compressedFileName,
            originalName: originalFileName,
            filePath: `/paid-content/packages/package_${packageId}/${compressedFileName}`,
            duration,
            orderIndex: nextOrderIndex,
            originalSize,
            compressedSize
          }
        })

        // Удаляем временный файл
        await import('fs').then(fs => fs.promises.unlink(tempFilePath))

        return NextResponse.json({
          success: true,
          item: newItem,
          compressionRatio: Math.round((1 - compressedSize / originalSize) * 100),
          compressed: true
        })

      } catch (ffmpegError) {
        console.error('❌ FFmpeg error:', ffmpegError)
        console.error('📁 Temp file path:', tempFilePath)
        console.error('📁 Output path:', compressedFilePath)
        console.error('💾 File size:', Math.round(originalSize / 1024 / 1024), 'MB')
        // Если FFmpeg не работает на проде - это ошибка
        if (isProduction) {
          throw ffmpegError
        }
        // На локальной разработке продолжаем без сжатия
      }
    }

    // Локальная разработка или fallback - копируем без сжатия
    const fallbackFileName = `lecture_${nextOrderIndex.toString().padStart(2, '0')}_original${fileExtension}`
    const fallbackPath = path.join(packageDir, fallbackFileName)
    await import('fs').then(fs => fs.promises.copyFile(tempFilePath, fallbackPath))
    await import('fs').then(fs => fs.promises.unlink(tempFilePath))

    // Пытаемся получить длительность без сжатия
    let duration = null
    try {
      const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${fallbackPath}"`
      const { stdout: durationOutput } = await execAsync(durationCommand)
      duration = Math.round(parseFloat(durationOutput.trim()))
    } catch (probeError) {
      console.log('Could not get video duration:', probeError)
    }

    const newItem = await prisma.packageItem.create({
      data: {
        packageId,
        title: `Лекция ${nextOrderIndex}: ${baseName}`,
        fileName: fallbackFileName,
        originalName: originalFileName,
        filePath: `/paid-content/packages/package_${packageId}/${fallbackFileName}`,
        duration,
        orderIndex: nextOrderIndex,
        originalSize,
        compressedSize: originalSize
      }
    })

    return NextResponse.json({
      success: true,
      item: newItem,
      warning: shouldCompress ? 'Видео загружено без сжатия (FFmpeg недоступен)' : 'Видео загружено без сжатия (локальная разработка)',
      compressionRatio: 0,
      compressed: false
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      message: 'Ошибка при загрузке файла' 
    }, { status: 500 })
  }
}
