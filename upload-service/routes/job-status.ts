import express from 'express'
import { videoQueue } from '../queue/videoQueue.js'

const router = express.Router()

router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    const job = await videoQueue.getJob(jobId)

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const state = await job.getState()
    const progress = job.progress
    const returnValue = job.returnvalue
    const failedReason = job.failedReason

    return res.json({
      jobId: job.id,
      state, // 'waiting' | 'active' | 'completed' | 'failed'
      progress,
      result: returnValue,
      error: failedReason,
    })
  } catch (error) {
    console.error('❌ Error fetching job status:', error)
    return res.status(500).json({ error: 'Failed to fetch job status' })
  }
})

export default router

