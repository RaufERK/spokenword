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
    console.log('📥 [PACKAGES] Upload request received')
    console.log('📋 [PACKAGES] Headers:', {
      'content-type': req.headers['content-type'],
      'x-user-id': req.headers['x-user-id'],
      'x-user-role': req.headers['x-user-role']
    })

    // Get user info from headers (set by Next.js middleware via Nginx)
    const userIdHeader = req.headers['x-user-id'] as string
    const userRole = req.headers['x-user-role'] as string

    // For direct upload (Nginx bypass), allow requests without strict auth
    // Frontend already checks permissions via Next.js middleware
    const userId = userIdHeader ? parseInt(userIdHeader, 10) : 1

    if (userIdHeader) {
      console.log(`👤 [PACKAGES] Upload by user: ${userId} (role: ${userRole})`)
      // Still validate role if headers present
      if (!['ADMIN', 'SUPER'].includes(userRole)) {
        console.log(`❌ [PACKAGES] Access denied for role: ${userRole}`)
        return res.status(403).json({ error: 'Access denied. Only ADMIN or SUPER can upload packages.' })
      }
    } else {
      console.log(`⚠️  [PACKAGES] Upload without auth headers - using default user (Nginx direct proxy)`)
    }

    // Validate content type
    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      console.log(`❌ [PACKAGES] Invalid content type: ${contentType}`)
      return res.status(400).json({ error: 'Invalid content type' })
    }

    console.log('✅ [PACKAGES] Starting busboy parsing...')

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
      console.log(`📝 [PACKAGES] Field received: ${fieldname} = ${val}`)
      if (fieldname === 'packageId') {
        uploadData.packageId = parseInt(val, 10)
        console.log(`📦 [PACKAGES] Package ID set to: ${uploadData.packageId}`)
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

        console.log(`📁 [PACKAGES] File received: ${filename}`)

        // Validate file extension
        if (!filename.endsWith('.mp4')) {
          console.log(`❌ [PACKAGES] Invalid file extension: ${filename}`)
          file.resume()
          return res.status(400).json({ error: 'Only .mp4 files allowed' })
        }

        // Validate packageId
        if (!uploadData.packageId) {
          console.log(`❌ [PACKAGES] Missing packageId`)
          file.resume()
          return res.status(400).json({ error: 'packageId is required' })
        }

        console.log(`🔍 [PACKAGES] Looking for package #${uploadData.packageId}...`)

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
          console.log(`❌ [PACKAGES] Package #${uploadData.packageId} not found in DB`)
          file.resume()
          return res.status(404).json({ error: `Package #${uploadData.packageId} not found` })
        }

        console.log(`✅ [PACKAGES] Package found: ${pkg.title}`)

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
            console.log(`📹 [PACKAGES] Getting video codec for: ${tempFilePath}`)
            const codec = await getVideoCodec(tempFilePath)
            console.log(`✅ [PACKAGES] Detected codec: ${codec}`)

            const shouldCompress = needsCompression(codec)
            const compressedFileName = `${timestamp}_${random}_compressed.mp4`
            const outputPath = path.join(packageDir, compressedFileName)

            console.log(`🎬 [PACKAGES] Adding to BullMQ queue...`)
            console.log(`   Package ID: ${uploadData.packageId}`)
            console.log(`   Temp file: ${tempFilePath}`)
            console.log(`   Output: ${outputPath}`)
            console.log(`   Will compress: ${shouldCompress ? 'Yes' : 'No (copy only)'}`)

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

            console.log(`✅ [PACKAGES] Added to compression queue successfully!`)
            console.log(`   Job ID: ${job.id}`)
            console.log(`   Codec: ${codec}`)

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
            console.error('❌ [PACKAGES] Error adding to queue:', queueError)
            return res.status(500).json({ error: 'Failed to queue compression job' })
          }
        })

        file.on('error', (err: Error) => {
          console.error('❌ [PACKAGES] File stream error:', err)
          writeStream.destroy()
          return res.status(500).json({ error: 'File upload failed' })
        })
      }
    )

    bb.on('close', () => {
      console.log(`🏁 [PACKAGES] Busboy closed. File processed: ${fileProcessed}`)
      if (!fileProcessed) {
        console.log(`⚠️  [PACKAGES] No file was processed!`)
      }
    })

    bb.on('error', (err: Error) => {
      console.error('❌ [PACKAGES] Busboy error:', err)
      return res.status(500).json({ error: 'Upload parsing failed' })
    })

    bb.on('finish', () => {
      console.log(`✅ [PACKAGES] Busboy finished parsing`)
    })

    // Pipe request to busboy
    console.log(`🔄 [PACKAGES] Piping request to busboy...`)
    req.pipe(bb)
  } catch (error) {
    console.error('❌ Package upload error:', error)
    return res.status(500).json({ error: 'Upload failed' })
  }
})

export default router

