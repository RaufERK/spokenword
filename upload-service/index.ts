import express from 'express'
import cors from 'cors'
import conferenceRouter from './routes/conference.js'
import packagesRouter from './routes/packages.js'
import classRouter from './routes/class.js'
import testRouter from './routes/test.js'
import jobStatusRouter from './routes/job-status.js'

const app = express()
const PORT = Number(process.env.UPLOAD_SERVICE_PORT || 3006)
const HOST = process.env.UPLOAD_SERVICE_HOST || '127.0.0.1'

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
app.use('/upload/class', classRouter)
if (process.env.NODE_ENV !== 'production') {
  app.use('/test', testRouter)
}
app.use('/job-status', jobStatusRouter)

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Upload service error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Graceful shutdown
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Upload service running on ${HOST}:${PORT}`)
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`)
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

