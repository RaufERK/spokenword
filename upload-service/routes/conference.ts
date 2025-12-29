import express from 'express'
import busboy from 'busboy'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
// Import Prisma from main project (shared instance)
import prisma from '../../lib/prisma.js'

const router = express.Router()

// Conference archive directory (relative to main project root)
const ARCHIVE_DIR = path.resolve(process.cwd(), '../public/conf-archive')

interface UploadData {
  displayName: string
  fileName: string
  fileSize: number
  systemName: string
  filePath: string
}

router.post('/', async (req, res) => {
  try {
    console.log('📥 [Upload Service] Conference upload request received')

    // Validate content type
    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    // Create directory if not exists
    await mkdir(ARCHIVE_DIR, { recursive: true })

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
      },
    })

    let uploadData: Partial<UploadData> = {}
    let fileProcessed = false

    // Handle text fields (displayName, userId, etc.)
    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'displayName') {
        uploadData.displayName = val
      }
      // We'll get userId from Next.js proxy or JWT later
    })

    // Handle file upload
    bb.on('file', async (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
      if (fieldname !== 'file') {
        file.resume() // Skip non-file fields
        return
      }

      const { filename } = info
      uploadData.fileName = filename
      fileProcessed = true

      // Validate file extension
      if (!filename.endsWith('.mp4')) {
        file.resume()
        return res.status(400).json({ error: 'Only .mp4 files allowed' })
      }

      // Generate unique system name
      const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
      const random = randomBytes(3).toString('hex')
      const systemName = `${timestamp}_${random}.mp4`
      uploadData.systemName = systemName

      const filePath = path.join(ARCHIVE_DIR, systemName)
      uploadData.filePath = filePath

      console.log(`📥 Uploading: ${filename} → ${systemName}`)

      // Stream file to disk
      const writeStream = createWriteStream(filePath)
      let bytesWritten = 0

      file.on('data', (chunk: Buffer) => {
        writeStream.write(chunk)
        bytesWritten += chunk.length

        // Log progress every 50MB
        if (bytesWritten % (50 * 1024 * 1024) < chunk.length) {
          console.log(`📊 Progress: ${Math.round(bytesWritten / 1024 / 1024)}MB`)
        }
      })

      file.on('end', () => {
        writeStream.end()
        uploadData.fileSize = bytesWritten
        console.log(`💾 File saved: ${filename} (${Math.round(bytesWritten / 1024 / 1024)}MB)`)
      })

      file.on('error', (err: Error) => {
        console.error('❌ File stream error:', err)
        writeStream.destroy()
        return res.status(500).json({ error: 'File upload failed' })
      })
    })

    // Handle completion
    bb.on('finish', async () => {
      if (!fileProcessed || !uploadData.displayName || !uploadData.systemName) {
        return res.status(400).json({ error: 'Missing required fields (file or displayName)' })
      }

      try {
        // TODO: Get real userId from JWT token
        // For now, use a default user ID (we'll add auth later)
        const userId = 1 // Placeholder

        // Save metadata to database
        const confFile = await prisma.conferenceFile.create({
          data: {
            displayName: uploadData.displayName,
            originalName: uploadData.fileName!,
            systemName: uploadData.systemName,
            uploadedBy: userId,
            size: uploadData.fileSize!,
          },
        })

        console.log(`✅ Conference file added to DB: ${uploadData.displayName}`)

        return res.status(200).json({
          ok: true,
          file: confFile,
          message: 'File uploaded successfully'
        })

      } catch (dbError) {
        console.error('❌ Database error:', dbError)
        return res.status(500).json({ error: 'Failed to save metadata to database' })
      }
    })

    bb.on('error', (err: Error) => {
      console.error('❌ Busboy error:', err)
      return res.status(500).json({ error: 'Upload parsing failed' })
    })

    // Pipe request to busboy
    req.pipe(bb)

  } catch (error) {
    console.error('❌ Conference upload error:', error)
    return res.status(500).json({ error: 'Upload failed' })
  }
})

export default router

