import express from 'express'
import busboy from 'busboy'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

const router = express.Router()

// Test upload directory (separate from production)
const TEST_DIR = path.resolve(process.cwd(), '../public/test-uploads')

/**
 * Test endpoint for automated file uploads
 * No authentication required (for testing only)
 * 
 * Usage:
 * curl -X POST http://localhost:3006/test/upload \
 *   -F "file=@/path/to/video.mp4" \
 *   -F "displayName=Test Video"
 */
router.post('/upload', async (req, res) => {
  try {
    console.log('🧪 [Test] Upload request received')

    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type. Use multipart/form-data' })
    }

    // Create test directory
    await mkdir(TEST_DIR, { recursive: true })

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB
      },
    })

    let displayName = ''
    let fileName = ''
    let fileSize = 0
    let systemName = ''
    let fileProcessed = false

    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'displayName') {
        displayName = val
      }
    })

    bb.on('file', async (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string }) => {
      if (fieldname !== 'file') {
        file.resume()
        return
      }

      fileName = info.filename
      fileProcessed = true

      // Generate unique name
      const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
      const random = randomBytes(3).toString('hex')
      const ext = path.extname(fileName)
      systemName = `test_${timestamp}_${random}${ext}`

      const filePath = path.join(TEST_DIR, systemName)

      console.log(`🧪 Uploading test file: ${fileName} → ${systemName}`)

      const writeStream = createWriteStream(filePath)
      let bytesWritten = 0
      const startTime = Date.now()

      file.on('data', (chunk: Buffer) => {
        writeStream.write(chunk)
        bytesWritten += chunk.length

        if (bytesWritten % (50 * 1024 * 1024) < chunk.length) {
          const elapsed = (Date.now() - startTime) / 1000
          const speed = (bytesWritten / 1024 / 1024) / elapsed
          console.log(`📊 Progress: ${Math.round(bytesWritten / 1024 / 1024)}MB (${speed.toFixed(2)} MB/s)`)
        }
      })

      file.on('end', () => {
        writeStream.end()
        fileSize = bytesWritten
        const elapsed = (Date.now() - startTime) / 1000
        console.log(`✅ Test file saved: ${fileName} (${Math.round(bytesWritten / 1024 / 1024)}MB in ${elapsed.toFixed(1)}s)`)
      })

      file.on('error', (err: Error) => {
        console.error('❌ File stream error:', err)
        writeStream.destroy()
      })
    })

    bb.on('finish', async () => {
      if (!fileProcessed) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      return res.status(200).json({
        ok: true,
        message: 'Test upload successful',
        file: {
          originalName: fileName,
          systemName: systemName,
          displayName: displayName || fileName,
          size: fileSize,
          sizeMB: Math.round(fileSize / 1024 / 1024 * 100) / 100,
          location: TEST_DIR,
        }
      })
    })

    bb.on('error', (err: Error) => {
      console.error('❌ Busboy error:', err)
      return res.status(500).json({ error: 'Upload parsing failed' })
    })

    req.pipe(bb)

  } catch (error) {
    console.error('❌ Test upload error:', error)
    return res.status(500).json({ error: 'Test upload failed' })
  }
})

// Test endpoint info
router.get('/info', (req, res) => {
  res.json({
    service: 'upload-service',
    endpoint: '/test/upload',
    description: 'Test endpoint for automated file uploads (no auth)',
    usage: {
      method: 'POST',
      url: 'http://localhost:3006/test/upload',
      fields: {
        file: 'required - file to upload',
        displayName: 'optional - display name for the file'
      },
      example: `curl -X POST http://localhost:3006/test/upload \\
  -F "file=@/path/to/video.mp4" \\
  -F "displayName=My Test Video"`
    },
    limits: {
      maxFileSize: '5GB',
      allowedTypes: 'any'
    }
  })
})

export default router

