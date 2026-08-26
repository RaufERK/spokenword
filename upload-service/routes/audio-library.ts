import { createWriteStream } from 'fs'
import { mkdir, unlink } from 'fs/promises'
import { randomBytes } from 'crypto'
import path from 'path'
import express from 'express'
import busboy from 'busboy'
import prisma from '../../lib/prisma.js'
import { requireUploader } from '../utils/auth.js'
import { getVideoDuration } from '../utils/video.js'

const router = express.Router()

const LIBRARY_DIR =
  process.env.NODE_ENV === 'production'
    ? '/home/appuser/apps/spokenword/shared/public/audio-library'
    : path.resolve(process.cwd(), '../public/audio-library')

const MAX_FILE_SIZE = 500 * 1024 * 1024
const ALLOWED_EXT = new Set(['.mp3', '.m4a', '.ogg', '.wav'])
const MIME_BY_EXT: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

function extensionOf(filename: string) {
  return path.extname(filename).toLowerCase()
}

router.post('/', async (req, res) => {
  try {
    const uploader = requireUploader(req, ['MODERATOR', 'ADMIN', 'SUPER'])
    if ('error' in uploader) {
      return res.status(uploader.status).json({ error: uploader.error })
    }

    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Invalid content type' })
    }

    await mkdir(LIBRARY_DIR, { recursive: true })

    const fields: { title?: string; year?: string; description?: string } = {}
    let responded = false
    let fileSeen = false

    const fail = (status: number, error: string) => {
      if (responded || res.headersSent) return
      responded = true
      res.status(status).json({ error })
    }

    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    })

    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'title' || fieldname === 'year' || fieldname === 'description') {
        fields[fieldname] = val
      }
    })

    bb.on(
      'file',
      (
        fieldname: string,
        file: NodeJS.ReadableStream,
        info: { filename: string; encoding: string; mimeType: string }
      ) => {
        if (fieldname !== 'file') {
          file.resume()
          return
        }

        fileSeen = true

        const { filename } = info
        const ext = extensionOf(filename)
        if (!ALLOWED_EXT.has(ext)) {
          file.resume()
          fail(400, 'Allowed formats: mp3, m4a, ogg, wav')
          return
        }

        const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
        const random = randomBytes(3).toString('hex')
        const systemName = `${timestamp}_${random}${ext}`
        const filePath = path.join(LIBRARY_DIR, systemName)
        const writeStream = createWriteStream(filePath)
        let bytesWritten = 0
        let truncated = false

        file.on('limit', () => {
          truncated = true
        })

        file.on('data', (chunk: Buffer) => {
          bytesWritten += chunk.length
        })

        file.pipe(writeStream)

        writeStream.on('finish', async () => {
          if (truncated) {
            await unlink(filePath).catch(() => undefined)
            fail(400, 'File is larger than 500MB')
            return
          }

          try {
            const durationSec = await getVideoDuration(filePath)
            const yearRaw = fields.year?.trim()
            const year = yearRaw ? Number.parseInt(yearRaw, 10) : null
            const title = fields.title?.trim() || path.parse(filename).name

            const lecture = await prisma.audioLecture.create({
              data: {
                title,
                year: Number.isInteger(year) ? year : null,
                description: fields.description?.trim() || null,
                originalName: filename,
                fileName: systemName,
                systemName,
                mimeType: MIME_BY_EXT[ext] || info.mimeType || 'application/octet-stream',
                size: bytesWritten,
                durationSec: durationSec || null,
                uploadedBy: uploader.userId,
              },
            })

            if (responded || res.headersSent) return
            responded = true
            res.status(200).json({
              ok: true,
              lecture: {
                ...lecture,
                size: Number(lecture.size),
              },
            })
          } catch (error) {
            console.error('Audio library upload failed:', error)
            await unlink(filePath).catch(() => undefined)
            fail(500, 'Failed to save lecture')
          }
        })

        writeStream.on('error', (error) => {
          console.error('Audio library write failed:', error)
          fail(500, 'File upload failed')
        })
      }
    )

    bb.on('error', (error: Error) => {
      console.error('Audio library busboy error:', error)
      fail(500, 'Upload parsing failed')
    })

    bb.on('finish', () => {
      if (!fileSeen && !responded && !res.headersSent) {
        fail(400, 'File is required')
      }
    })

    req.pipe(bb)
  } catch (error) {
    console.error('Audio library upload error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Upload failed' })
    }
  }
})

export default router
