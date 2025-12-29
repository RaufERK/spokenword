import { Queue } from 'bullmq'
import { createClient } from 'redis'

// Create Redis connection for BullMQ
const redisConnection = createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
})

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redisConnection.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err)
})

export interface VideoCompressionJob {
  packageId?: number
  conferenceFileId?: number
  tempFilePath: string
  outputPath: string
  originalFileName: string
  originalSize: number
  nextOrderIndex?: number
  compressedFileName: string
  userId: number
  type: 'package' | 'conference'
}

export const videoQueue = new Queue<VideoCompressionJob>('video-compression', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
      count: 1000,
    },
  },
})

export async function addVideoToQueue(data: VideoCompressionJob) {
  const prefix = data.type === 'package' ? `pkg_${data.packageId}` : `conf_${data.conferenceFileId}`
  const jobId = `${prefix}_${Date.now()}_${data.originalFileName}`

  const job = await videoQueue.add('compress', data, {
    jobId,
    priority: data.type === 'package' ? 1 : 2, // Conference has higher priority
  })

  console.log(`📋 [VideoQueue] Added to queue: ${job.id}`)
  return job
}

export async function getJobStatus(jobId: string) {
  const job = await videoQueue.getJob(jobId)
  if (!job) return null

  const state = await job.getState()
  const progress = job.progress

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
  }
}

