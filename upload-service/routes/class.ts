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

const ARCHIVE_DIR = process.env.NODE_ENV === 'production'
  ? '/home/appuser/apps/spokenword/shared/public/class-archive'
  : path.resolve(process.cwd(), '../public/class-archive')

const TEMP_DIR = process.env.NODE_ENV === 'production'
  ? '/home/appuser/apps/spokenword/shared/public/class-archive/temp'
  : path.resolve(process.cwd(), '../public/class-archive/temp')

interface UploadData {
  displayName: string
  fileName: string
  fileSize: number
  systemName: string
  filePath: string
}

router.post('/', async (req, res) => {
  try {
    console.log('📥 [Upload Service] Class upload request received')

    const userIdHeader = req.headers['x-user-id'] as string
    const userRole = req.headers['x-user-role'] as string
    const userId = userIdHeader || '1'

    if (userIdHeader) {
      console.log(`👤 Class upload by user: ${userId} (role: ${userRole})`)
    } else {
      console.log(`⚠️  Class upload without auth (testing mode)`)
    }

    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    await mkdir(ARCHIVE_DIR, { recursive: true })
    await mkdir(TEMP_DIR, { recursive: true })

    const bb = busboy({
      headers: req.headers,
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024,
      },
    })

    let uploadData: Partial<UploadData> = {}
    let fileProcessed = false

    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'displayName') {
        uploadData.displayName = val
      }
    })

    bb.on(
      'file',
      async (
        fieldname: string,
        file: NodeJS.ReadableStream,
        info: { filename: string; encoding: string; mimeType: string }
      ) => {
        if (fieldname !== 'file') {
          file.resume()
          return
        }

        const { filename } = info
        uploadData.fileName = filename
        fileProcessed = true

        if (!filename.endsWith('.mp4')) {
          file.resume()
          return res.status(400).json({ error: 'Only .mp4 files allowed' })
        }

        const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
        const random = randomBytes(3).toString('hex')
        const systemName = `${timestamp}_${random}.mp4`
        uploadData.systemName = systemName

        const tempFilePath = path.join(TEMP_DIR, `temp_${systemName}`)
        uploadData.filePath = tempFilePath

        console.log(`📥 Class uploading: ${filename} → temp_${systemName}`)

        const writeStream = createWriteStream(tempFilePath)
        let bytesWritten = 0

        file.on('data', (chunk: Buffer) => {
          writeStream.write(chunk)
          bytesWritten += chunk.length

          if (bytesWritten % (50 * 1024 * 1024) < chunk.length) {
            console.log(`📊 Class upload progress: ${Math.round(bytesWritten / 1024 / 1024)}MB`)
          }
        })

        file.on('end', async () => {
          writeStream.end()
          uploadData.fileSize = bytesWritten
          console.log(`💾 Class file saved: ${filename} (${Math.round(bytesWritten / 1024 / 1024)}MB)`)

          try {
            const codec = await getVideoCodec(tempFilePath)
            console.log(`📹 Detected codec: ${codec}`)

            const shouldCompress = needsCompression(codec)
            const finalPath = path.join(ARCHIVE_DIR, systemName)
            const userIdNumber = parseInt(userIdHeader || '1', 10)

            const classFile = await prisma.classFile.create({
              data: {
                displayName: uploadData.displayName!,
                originalName: filename,
                systemName,
                uploadedBy: userIdNumber,
                size: bytesWritten,
              },
            })

            console.log(`✅ Class file added to DB: ${uploadData.displayName}`)

            const classFileJson = {
              ...classFile,
              size: Number(classFile.size),
            }

            if (shouldCompress || codec === 'h264' || codec === 'hevc') {
              const job = await addVideoToQueue({
                type: 'class',
                classFileId: classFile.id,
                tempFilePath,
                outputPath: finalPath,
                originalFileName: filename,
                originalSize: bytesWritten,
                compressedFileName: systemName,
                userId: userIdNumber,
              })

              console.log(`🔄 Class file added to compression queue: ${job.id}`)

              res.status(200).json({
                ok: true,
                file: classFileJson,
                message: 'File uploaded and queued for processing',
                jobId: job.id,
                willCompress: shouldCompress,
              })
            } else {
              console.log(`⚠️  Unknown codec, moving to final location without compression`)
              const fs = await import('fs/promises')
              await fs.rename(tempFilePath, finalPath)

              res.status(200).json({
                ok: true,
                file: classFileJson,
                message: 'File uploaded successfully (no compression)',
              })
            }
          } catch (codecError) {
            console.error('❌ Error checking codec:', codecError)
            return res.status(500).json({ error: 'Failed to process video codec' })
          }
        })

        file.on('error', (err: Error) => {
          console.error('❌ Class file stream error:', err)
          writeStream.destroy()
          return res.status(500).json({ error: 'File upload failed' })
        })
      }
    )

    bb.on('error', (err: Error) => {
      console.error('❌ Busboy error:', err)
      return res.status(500).json({ error: 'Upload parsing failed' })
    })

    req.pipe(bb)
  } catch (error) {
    console.error('❌ Class upload error:', error)
    return res.status(500).json({ error: 'Upload failed' })
  }
})

export default router
