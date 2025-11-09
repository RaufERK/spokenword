// DEPRECATED: Этот файл больше не используется
// Используйте workers/video-compressor.ts и lib/videoQueue.ts

import { getJobStatus as getQueueJobStatus } from './videoQueue'

export async function getJobStatus(jobId: string) {
  return await getQueueJobStatus(jobId)
}

export function removeJob(jobId: string) {
  console.warn('removeJob is deprecated - jobs auto-removed by BullMQ')
}
