import { createVideoCompressionWorker } from './video-compressor'

const { worker, shutdown } = createVideoCompressionWorker()

let closing = false

const stop = async (reason: string) => {
  if (closing) return
  closing = true
  console.log(`[${reason}] Stopping spokenword video worker...`)
  await shutdown(reason)
  process.exit(0)
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))
process.once('uncaughtException', (err) => {
  console.error('Uncaught exception in video worker', err)
  stop('uncaughtException')
})
process.once('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in video worker', reason)
  stop('unhandledRejection')
})

worker.on('closed', () => {
  if (!closing) {
    console.log('Worker closed')
  }
})

console.log('🔄 Video compression worker started (queue: video-compression)')


