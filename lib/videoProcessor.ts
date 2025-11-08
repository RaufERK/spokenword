import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

interface ProcessingJob {
  id: string
  packageId: number
  tempFilePath: string
  outputPath: string
  originalSize: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

// В реальном приложении это должно быть в Redis или базе данных
const processingJobs = new Map<string, ProcessingJob>()

export async function startVideoProcessing(
  jobId: string,
  packageId: number,
  tempFilePath: string,
  outputPath: string,
  originalSize: number
) {
  const job: ProcessingJob = {
    id: jobId,
    packageId,
    tempFilePath,
    outputPath,
    originalSize,
    status: 'pending',
    progress: 0
  }

  processingJobs.set(jobId, job)

  // Запускаем обработку в фоне
  processVideoInBackground(job)

  return jobId
}

async function processVideoInBackground(job: ProcessingJob) {
  try {
    job.status = 'processing'
    job.progress = 10
    processingJobs.set(job.id, job)

    // FFmpeg команда с прогрессом
    const ffmpegCommand = `ffmpeg -i "${job.tempFilePath}" -vf scale=1280:720 -c:v libx264 -crf 23 -preset fast -c:a aac -b:a 128k -movflags +faststart -threads 2 -bufsize 1M "${job.outputPath}"`
    
    const options = {
      maxBuffer: 1024 * 1024 * 10, // 10MB буфер
      timeout: 1000 * 60 * 15, // 15 минут таймаут
    }

    job.progress = 50
    processingJobs.set(job.id, job)

    await execAsync(ffmpegCommand, options)

    job.progress = 90
    processingJobs.set(job.id, job)

    // Получаем длительность
    const durationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${job.outputPath}"`
    const { stdout: durationOutput } = await execAsync(durationCommand)
    const duration = Math.round(parseFloat(durationOutput.trim()))

    // Получаем размер сжатого файла
    const { stat } = await import('fs').then(fs => fs.promises)
    const { size: compressedSize } = await stat(job.outputPath)

    job.progress = 100
    job.status = 'completed'
    processingJobs.set(job.id, job)

    // Удаляем временный файл
    await import('fs').then(fs => fs.promises.unlink(job.tempFilePath))

    console.log(`Video processing completed for job ${job.id}`)

  } catch (error) {
    console.error(`Video processing failed for job ${job.id}:`, error)
    job.status = 'error'
    job.error = error instanceof Error ? error.message : 'Unknown error'
    processingJobs.set(job.id, job)

    // Очищаем временные файлы при ошибке
    try {
      await import('fs').then(fs => fs.promises.unlink(job.tempFilePath))
    } catch {}
  }
}

export function getJobStatus(jobId: string): ProcessingJob | null {
  return processingJobs.get(jobId) || null
}

export function removeJob(jobId: string) {
  processingJobs.delete(jobId)
}
