import { Queue } from 'bullmq'
import redis from './redis'

export interface VideoCompressionJob {
  packageId: number
  tempFilePath: string
  outputPath: string
  originalFileName: string
  originalSize: number
  nextOrderIndex: number
  compressedFileName: string
  userId: number
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
  const jobId = `${data.packageId}_${Date.now()}_${data.originalFileName}`
  
  const job = await videoQueue.add('compress', data, {
    jobId,
    priority: 1,
  })
  
  console.log(`📋 Добавлено в очередь: ${job.id}`)
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

