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

// Base directory for paid content packages (relative to main project root)
const PAID_CONTENT_DIR = path.resolve(process.cwd(), '../paid-content/packages')

interface UploadData {
  displayName?: string
  fileName: string
  fileSize: number
  systemName: string
  filePath: string
  packageId: number
}

router.post('/', async (req, res) => {
  try {
    console.log('📥 [Upload Service] Package upload request received')

    // Get user info from headers (set by Next.js middleware via Nginx)
    const userIdHeader = req.headers['x-user-id'] as string
    const userRole = req.headers['x-user-role'] as string

    // For direct upload (Nginx bypass), allow requests without strict auth
    // Frontend already checks permissions via Next.js middleware
    const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1

    if (userIdHeader) {
      console.log(`👤 Upload by user: ${userId} (role: ${userRole})`)
      // Still validate role if headers present
      if (!['ADMIN', 'SUPER'].includes(userRole)) {
        return res.status(403).json({ error: 'Access denied. Only ADMIN or SUPER can upload packages.' })
      }
    } else {
      console.log(`⚠️  Package upload without auth headers - using default user (Nginx direct proxy)`)
    }

    // Validate content type
    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
      },
    })

    let uploadData: Partial<UploadData> = {}
    let fileProcessed = false

    // Handle text fields (packageId, displayName)
    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'packageId') {
        uploadData.packageId = parseInt(val, 10)
      } else if (fieldname === 'displayName') {
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

        // Validate packageId
        if (!uploadData.packageId) {
          file.resume()
          return res.status(400).json({ error: 'packageId is required' })
        }

        // Verify package exists
        const pkg = await prisma.package.findUnique({
          where: { id: uploadData.packageId },
          include: {
            items: {
              orderBy: { orderIndex: 'desc' },
              take: 1,
            },
          },
        })

        if (!pkg) {
          file.resume()
          return res.status(404).json({ error: `Package #${uploadData.packageId} not found` })
        }

        // Determine next order index
        const nextOrderIndex = pkg.items.length > 0 ? pkg.items[0].orderIndex + 1 : 1

        // Create package directory
        const packageDir = path.join(PAID_CONTENT_DIR, `package_${uploadData.packageId}`)
        await mkdir(packageDir, { recursive: true })

        // Generate unique temp file name
        const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
        const random = randomBytes(3).toString('hex')
        const tempFileName = `temp_${timestamp}_${random}.mp4`
        const tempFilePath = path.join(packageDir, tempFileName)

        uploadData.systemName = tempFileName
        uploadData.filePath = tempFilePath

        console.log(`📥 Uploading: ${filename} → ${tempFileName}`)

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

          // Check codec and add to compression queue
          try {
            const codec = await getVideoCodec(tempFilePath)
            console.log(`📹 Detected codec: ${codec}`)

            const shouldCompress = needsCompression(codec)
            const compressedFileName = `${timestamp}_${random}_compressed.mp4`
            const outputPath = path.join(packageDir, compressedFileName)

            // Add to compression queue
            const job = await addVideoToQueue({
              type: 'package',
              packageId: uploadData.packageId!,
              tempFilePath,
              outputPath,
              originalFileName: filename,
              originalSize: bytesWritten,
              nextOrderIndex,
              compressedFileName,
              userId,
            })

            console.log(`🔄 Added to compression queue: ${job.id}`)
            console.log(`   Codec: ${codec}, Will compress: ${shouldCompress ? 'Yes' : 'No (copy only)'}`)

            // Return success response
            res.status(200).json({
              ok: true,
              message: 'File uploaded and queued for compression',
              jobId: job.id,
              packageId: uploadData.packageId,
              originalFileName: filename,
              size: bytesWritten,
              willCompress: shouldCompress,
            })
          } catch (queueError) {
            console.error('❌ Error adding to queue:', queueError)
            return res.status(500).json({ error: 'Failed to queue compression job' })
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
    console.error('❌ Package upload error:', error)
    return res.status(500).json({ error: 'Upload failed' })
  }
})

export default router

