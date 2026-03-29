import { Worker, Job } from 'bullmq'
import { spawn } from 'child_process'
import { unlink, stat, mkdir } from 'fs/promises'
import redis from '../../lib/redis.js'
import prisma from '../../lib/prisma.js'
import type { VideoCompressionJob } from '../queue/videoQueue.js'
import path from 'path'

const queueName = 'video-compression'

// Use shared Redis connection from main project (ioredis)

export function createCompressionWorker() {
  const worker = new Worker<VideoCompressionJob>(
    queueName,
    async (job: Job<VideoCompressionJob>) => {
      const {
        type,
        packageId,
        conferenceFileId,
        classFileId,
        tempFilePath,
        outputPath,
        originalFileName,
        originalSize,
        nextOrderIndex,
        compressedFileName,
        userId,
      } = job.data

      let label: string
      if (type === 'package') label = `Package #${packageId}`
      else if (type === 'class') label = `Class #${classFileId}`
      else label = `Conference #${conferenceFileId}`
      console.log(`\n🎬 [${label}] Starting compression: ${originalFileName}`)
      console.log(`📊 Size: ${Math.round(originalSize / 1024 / 1024)}MB`)

      let tempFileDeleted = false

      try {
        job.updateProgress(10)

        const videoCodec = await getVideoCodec(tempFilePath)
        console.log(`📹 Video codec: ${videoCodec}`)

        let ffmpegArgs: string[]

        if (videoCodec === 'h264' || videoCodec === 'hevc') {
          console.log(`✅ Video already compressed (${videoCodec}), copying without re-encoding`)
          ffmpegArgs = [
            '-y',
            '-i',
            tempFilePath,
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-b:a',
            '96k',
            '-movflags',
            '+faststart',
            outputPath,
          ]
        } else {
          console.log(`🔄 Compressing video from ${videoCodec} to H.264`)
          ffmpegArgs = [
            '-y',
            '-i',
            tempFilePath,
            '-vf',
            'scale=1280:720',
            '-c:v',
            'libx264',
            '-crf',
            '28',
            '-preset',
            'ultrafast',
            '-c:a',
            'aac',
            '-b:a',
            '96k',
            '-movflags',
            '+faststart',
            '-threads',
            '2',
            '-bufsize',
            '512k',
            '-maxrate',
            '2M',
            outputPath,
          ]
        }

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath)
        await mkdir(outputDir, { recursive: true })

        await compressVideoWithSpawn(ffmpegArgs, job)

        job.updateProgress(90)

        const { size: compressedSize } = await stat(outputPath)

        console.log(
          `📉 Compression: ${Math.round(originalSize / 1024 / 1024)}MB → ${Math.round(compressedSize / 1024 / 1024)}MB`
        )
        console.log(`🎯 Ratio: ${Math.round((1 - compressedSize / originalSize) * 100)}%`)

        const duration = await getVideoDuration(outputPath)

        // Save to database based on type
        if (type === 'package' && packageId) {
          const baseName = originalFileName.replace(/\.[^/.]+$/, '')
          const newItem = await prisma.packageItem.create({
            data: {
              packageId,
              title: `Лекция ${nextOrderIndex}: ${baseName}`,
              fileName: compressedFileName,
              originalName: originalFileName,
              filePath: `/paid-content/packages/package_${packageId}/${compressedFileName}`,
              duration,
              orderIndex: nextOrderIndex!,
              originalSize,
              compressedSize,
            },
          })
          console.log(`✅ [Package #${packageId}] Created item: ${newItem.title}`)
        } else if (type === 'conference' && conferenceFileId) {
          await prisma.conferenceFile.update({
            where: { id: conferenceFileId },
            data: {
              size: compressedSize,
              duration,
            },
          })
          console.log(`✅ [Conference #${conferenceFileId}] Updated with compressed size and duration`)
        } else if (type === 'class' && classFileId) {
          await prisma.classFile.update({
            where: { id: classFileId },
            data: {
              size: compressedSize,
              duration,
            },
          })
          console.log(`✅ [Class #${classFileId}] Updated with compressed size and duration`)
        }

        // Delete temp file
        await unlink(tempFilePath)
        tempFileDeleted = true

        // Update progress to 100% and wait to ensure client receives it
        await job.updateProgress(100)
        
        // Small delay to ensure progress update is visible to client before job completes
        await new Promise(resolve => setTimeout(resolve, 500))

        console.log(`✅ Done: ${originalFileName}\n`)

        return {
          success: true,
          compressionRatio: Math.round((1 - compressedSize / originalSize) * 100),
        }
      } catch (error) {
        console.error(`❌ Error processing ${originalFileName}:`, error)

        if (!tempFileDeleted) {
          try {
            await unlink(tempFilePath)
            console.log('🧹 Temp file deleted after error')
          } catch (cleanupError) {
            console.warn('⚠️  Could not delete temp file:', cleanupError)
          }
        }

        throw error
      }
    },
    {
      connection: redis,
      concurrency: 1,
      limiter: {
        max: 1,
        duration: 1000,
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('Worker error:', err)
  })

  const shutdown = async (reason?: string) => {
    const label = reason ? ` (${reason})` : ''
    console.log(`Shutting down compression worker${label}...`)

    await Promise.all([
      worker.close().catch((err: Error) => console.error('Error closing worker:', err)),
      // Note: Redis connection is shared, don't close it here
      prisma.$disconnect().catch((err: Error) => console.error('Error disconnecting prisma:', err)),
    ])
  }

  console.log(`🔄 Video compression worker ready (queue: ${queueName})`)

  return { worker, shutdown }
}

function compressVideoWithSpawn(args: string[], job: Job): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args)

    let errorOutput = ''

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString()
      errorOutput += output

      // Parse progress from ffmpeg output
      const timeMatch = output.match(/time=(\d+):(\d+):(\d+)/)
      if (timeMatch) {
        const [, hours, minutes, seconds] = timeMatch
        const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)
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
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'quiet',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      filePath,
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

function getVideoCodec(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'quiet',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name',
      '-of',
      'csv=p=0',
      filePath,
    ])

    let output = ''
    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const codec = output.trim().toLowerCase()
        resolve(codec || 'unknown')
      } else {
        resolve('unknown')
      }
    })

    ffprobe.on('error', () => {
      resolve('unknown')
    })
  })
}

// Auto-start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { worker, shutdown } = createCompressionWorker()

  let closing = false

  const stop = async (reason: string) => {
    if (closing) return
    closing = true
    console.log(`[${reason}] Stopping compression worker...`)
    await shutdown(reason)
    process.exit(0)
  }

  process.once('SIGINT', () => stop('SIGINT'))
  process.once('SIGTERM', () => stop('SIGTERM'))
  process.once('uncaughtException', (err) => {
    console.error('Uncaught exception in compression worker', err)
    stop('uncaughtException')
  })
  process.once('unhandledRejection', (reason) => {
    console.error('Unhandled rejection in compression worker', reason)
    stop('unhandledRejection')
  })

  worker.on('closed', () => {
    if (!closing) {
      console.log('Worker closed')
    }
  })
}

