import { Queue } from 'bullmq'
import redis from '../../lib/redis.js'

// Use shared Redis connection from main project (ioredis)

export interface VideoCompressionJob {
  packageId?: number
  conferenceFileId?: number
  classFileId?: number
  tempFilePath: string
  outputPath: string
  originalFileName: string
  originalSize: number
  nextOrderIndex?: number
  compressedFileName: string
  userId: number
  type: 'package' | 'conference' | 'class'
}

export const videoQueue = new Queue<VideoCompressionJob>('video-compression', {
  connection: redis,
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
  let prefix: string
  if (data.type === 'package') prefix = `pkg_${data.packageId}`
  else if (data.type === 'class') prefix = `class_${data.classFileId}`
  else prefix = `conf_${data.conferenceFileId}`

  const jobId = `${prefix}_${Date.now()}_${data.originalFileName}`

  const job = await videoQueue.add('compress', data, {
    jobId,
    priority: data.type === 'package' ? 1 : 2,
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

