import express from 'express'
import cors from 'cors'
import conferenceRouter from './routes/conference.js'
import packagesRouter from './routes/packages.js'
import testRouter from './routes/test.js'
import jobStatusRouter from './routes/job-status.js'

const app = express()
const PORT = process.env.UPLOAD_SERVICE_PORT || 3006

// CORS - allow requests only from Next.js app
app.use(cors({
  origin: ['http://localhost:3005', 'http://localhost:3000'],
  credentials: true
}))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'upload-service', port: PORT })
})

// Routes
app.use('/upload/conference', conferenceRouter)
app.use('/upload/packages', packagesRouter)
app.use('/test', testRouter)
app.use('/job-status', jobStatusRouter)

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Upload service error:', err)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`✅ Upload service running on port ${PORT}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
})

process.on('SIGTERM', () => {
  console.log('⏸️  SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('⏸️  SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

export default app

