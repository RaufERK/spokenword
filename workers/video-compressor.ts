import { Worker, Job } from 'bullmq'
import { spawn } from 'child_process'
import { unlink, stat } from 'fs/promises'
import redis from '../lib/redis'
import prisma from '../lib/prisma'
import type { VideoCompressionJob } from '../lib/videoQueue'

const worker = new Worker<VideoCompressionJob>(
  'video-compression',
  async (job: Job<VideoCompressionJob>) => {
    const { 
      packageId, 
      tempFilePath, 
      outputPath, 
      originalFileName,
      originalSize,
      nextOrderIndex,
      compressedFileName,
      userId 
    } = job.data

    console.log(`\n🎬 Начинаем сжатие: ${originalFileName}`)
    console.log(`📊 Размер: ${Math.round(originalSize / 1024 / 1024)}MB`)

    let tempFileDeleted = false

    try {
      // Обновляем статус в Redis
      await redis.set(
        `upload:${packageId}:${originalFileName}`,
        JSON.stringify({ status: 'processing', jobId: job.id, timestamp: Date.now() }),
        'EX',
        3600
      )

      job.updateProgress(10)

      // Запускаем FFmpeg через spawn (НЕ БУФЕРИЗУЕМ!)
      const ffmpegArgs = [
        '-y',
        '-i', tempFilePath,
        '-vf', 'scale=1280:720',
        '-c:v', 'libx264',
        '-crf', '26',
        '-preset', 'veryfast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-threads', '0',
        outputPath
      ]

      const result = await compressVideoWithSpawn(ffmpegArgs, job)

      job.updateProgress(90)

      // Получаем размер сжатого файла
      const { size: compressedSize } = await stat(outputPath)
      
      console.log(`📉 Сжатие: ${Math.round(originalSize / 1024 / 1024)}MB → ${Math.round(compressedSize / 1024 / 1024)}MB`)
      console.log(`🎯 Коэффициент: ${Math.round((1 - compressedSize / originalSize) * 100)}%`)

      // Получаем длительность
      const duration = await getVideoDuration(outputPath)

      // Создаём запись в БД
      const baseName = originalFileName.replace(/\.[^/.]+$/, '')
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
      await unlink(tempFilePath)
      tempFileDeleted = true

      // Обновляем статус на "done"
      await redis.set(
        `upload:${packageId}:${originalFileName}`,
        JSON.stringify({ 
          status: 'done', 
          itemId: newItem.id,
          timestamp: Date.now() 
        }),
        'EX',
        86400
      )

      job.updateProgress(100)

      console.log(`✅ Готово: ${originalFileName}\n`)

      return {
        success: true,
        item: newItem,
        compressionRatio: Math.round((1 - compressedSize / originalSize) * 100)
      }

    } catch (error) {
      console.error(`❌ Ошибка обработки ${originalFileName}:`, error)

      // Обновляем статус на "error"
      await redis.set(
        `upload:${packageId}:${originalFileName}`,
        JSON.stringify({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now() 
        }),
        'EX',
        86400
      )

      // ВСЕГДА чистим временный файл
      if (!tempFileDeleted) {
        try {
          await unlink(tempFilePath)
          console.log('🧹 Временный файл удалён после ошибки')
        } catch (cleanupError) {
          console.warn('⚠️ Не удалось удалить временный файл:', cleanupError)
        }
      }

      throw error
    }
  },
  {
    connection: redis,
    concurrency: 1, // ОДИН ФАЙЛ ЗА РАЗ!
    limiter: {
      max: 1,
      duration: 1000,
    },
  }
)

function compressVideoWithSpawn(args: string[], job: Job): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args)

    let errorOutput = ''

    // НЕ БУФЕРИЗУЕМ - просто логируем
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString()
      errorOutput += output
      
      // Парсим прогресс из вывода ffmpeg
      const timeMatch = output.match(/time=(\d+):(\d+):(\d+)/)
      if (timeMatch) {
        const [, hours, minutes, seconds] = timeMatch
        const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)
        // Примерный прогресс (10-90%)
        const progress = Math.min(90, 10 + Math.floor(totalSeconds / 10))
        job.updateProgress(progress).catch(() => {})
      }
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${errorOutput.slice(-500)}`))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`FFmpeg spawn error: ${err.message}`))
    })
  })
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath
    ])

    let output = ''
    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = Math.round(parseFloat(output.trim()))
        resolve(duration || 0)
      } else {
        resolve(0)
      }
    })

    ffprobe.on('error', () => {
      resolve(0)
    })
  })
}

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('Worker error:', err)
})

console.log('🔄 Video compression worker started (concurrency: 1)')

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await worker.close()
  await redis.quit()
  process.exit(0)
})

