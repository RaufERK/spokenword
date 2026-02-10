import express from 'express'
import busboy from 'busboy'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import prisma from '../../lib/prisma.js'
import { addVideoToQueue } from '../queue/videoQueue.js'
import { getVideoCodec, needsCompression } from '../utils/video.js'

const router = express.Router()

// Conference archive directory (relative to main project root)
// В production используем абсолютный путь к shared папке (избегаем symlinks из-за Turbopack)
const ARCHIVE_DIR = process.env.NODE_ENV === 'production'
  ? '/home/appuser/apps/spokenword/shared/public/conf-archive'
  : path.resolve(process.cwd(), '../public/conf-archive')
// Temp directory for uploads before compression
const TEMP_DIR = process.env.NODE_ENV === 'production'
  ? '/home/appuser/apps/spokenword/shared/public/conf-archive/temp'
  : path.resolve(process.cwd(), '../public/conf-archive/temp')

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

    // Get userId from header (set by Next.js middleware via Nginx)
    const userIdHeader = req.headers['x-user-id'] as string
    const userRole = req.headers['x-user-role'] as string

    // For direct testing, allow requests without user ID (will use default)
    const userId = userIdHeader || '1' // Default to user 1 for testing

    if (userIdHeader) {
      console.log(`👤 Upload by user: ${userId} (role: ${userRole})`)
    } else {
      console.log(`⚠️  Upload without auth (testing mode) - using default user`)
    }

    // Validate content type
    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    // Create directories
    await mkdir(ARCHIVE_DIR, { recursive: true })
    await mkdir(TEMP_DIR, { recursive: true })

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
      },
    })

    let uploadData: Partial<UploadData> = {}
    let fileProcessed = false

    // Handle text fields (displayName)
    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'displayName') {
        uploadData.displayName = val
      }
    })

    // Handle file upload
    bb.on(
      'file',
      async (
        fieldname: string,
        file: NodeJS.ReadableStream,
        info: { filename: string; encoding: string; mimeType: string }
      ) => {
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

        // Save to temp directory first
        const tempFilePath = path.join(TEMP_DIR, `temp_${systemName}`)
        uploadData.filePath = tempFilePath

        console.log(`📥 Uploading: ${filename} → temp_${systemName}`)

        // Stream file to disk
        const writeStream = createWriteStream(tempFilePath)
        let bytesWritten = 0

        file.on('data', (chunk: Buffer) => {
          writeStream.write(chunk)
          bytesWritten += chunk.length

          // Log progress every 50MB
          if (bytesWritten % (50 * 1024 * 1024) < chunk.length) {
            console.log(`📊 Progress: ${Math.round(bytesWritten / 1024 / 1024)}MB`)
          }
        })

        file.on('end', async () => {
          writeStream.end()
          uploadData.fileSize = bytesWritten
          console.log(`💾 File saved: ${filename} (${Math.round(bytesWritten / 1024 / 1024)}MB)`)

          // Check codec and decide if compression is needed
          try {
            const codec = await getVideoCodec(tempFilePath)
            console.log(`📹 Detected codec: ${codec}`)

            const shouldCompress = needsCompression(codec)
            const finalPath = path.join(ARCHIVE_DIR, systemName)
            const userIdNumber = parseInt(userIdHeader || '1', 10)

            // Create DB entry first
            const confFile = await prisma.conferenceFile.create({
              data: {
                displayName: uploadData.displayName!,
                originalName: filename,
                systemName,
                uploadedBy: userIdNumber,
                size: bytesWritten,
              },
            })

            console.log(`✅ Conference file added to DB: ${uploadData.displayName}`)

            // Convert BigInt to Number for JSON serialization
            const confFileJson = {
              ...confFile,
              size: Number(confFile.size),
            }

            if (shouldCompress || codec === 'h264' || codec === 'hevc') {
              // Add to compression queue (even for h264/hevc - they will be copied with optimization)
              const job = await addVideoToQueue({
                type: 'conference',
                conferenceFileId: confFile.id,
                tempFilePath,
                outputPath: finalPath,
                originalFileName: filename,
                originalSize: bytesWritten,
                compressedFileName: systemName,
                userId: userIdNumber,
              })

              console.log(`🔄 Added to compression queue: ${job.id}`)
              console.log(`   Codec: ${codec}, Will compress: ${shouldCompress ? 'Yes' : 'No (copy only)'}`)

              res.status(200).json({
                ok: true,
                file: confFileJson,
                message: 'File uploaded and queued for processing',
                jobId: job.id,
                willCompress: shouldCompress,
              })
            } else {
              // Unknown codec or error - just move to final location without compression
              console.log(`⚠️  Unknown codec, moving to final location without compression`)
              const fs = await import('fs/promises')
              await fs.rename(tempFilePath, finalPath)

              res.status(200).json({
                ok: true,
                file: confFileJson,
                message: 'File uploaded successfully (no compression)',
              })
            }
          } catch (codecError) {
            console.error('❌ Error checking codec:', codecError)
            return res.status(500).json({ error: 'Failed to process video codec' })
          }
        })

        file.on('error', (err: Error) => {
          console.error('❌ File stream error:', err)
          writeStream.destroy()
          return res.status(500).json({ error: 'File upload failed' })
        })
      }
    )

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
