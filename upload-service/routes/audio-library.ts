import { createWriteStream } from 'fs'
import { mkdir, unlink } from 'fs/promises'
import { createHash, randomBytes } from 'crypto'
import path from 'path'
import express from 'express'
import busboy from 'busboy'
import prisma from '../../lib/prisma.js'
import { decodeUploadName } from '../../lib/audio-library.js'
import { makeSpeechPlayable } from '../../lib/audio-playable.js'
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

function isUniqueConflict(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}

function duplicateMessage(title: string) {
  return `Этот файл уже есть в библиотеке: «${title}»`
}

router.post('/', async (req, res) => {
  try {
    const uploader = await requireUploader(req, ['MODERATOR', 'ADMIN', 'SUPER'])
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

    const fail = (status: number, error: string, extra?: { existingId: number }) => {
      if (responded || res.headersSent) return
      responded = true
      res.status(status).json({ error, ...extra })
    }

    const bb = busboy({
      headers: req.headers,
      defCharset: 'utf8',
      defParamCharset: 'utf8',
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    })

    bb.on('field', (fieldname: string, val: string) => {
      if (fieldname === 'title' || fieldname === 'year' || fieldname === 'description') {
        fields[fieldname] = decodeUploadName(val)
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

        const filename = decodeUploadName(info.filename)
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
        const digest = createHash('sha256')
        let bytesWritten = 0
        let truncated = false

        file.on('limit', () => {
          truncated = true
        })

        file.on('data', (chunk: Buffer) => {
          bytesWritten += chunk.length
          digest.update(chunk)
        })

        file.pipe(writeStream)

        writeStream.on('finish', async () => {
          if (truncated) {
            await unlink(filePath).catch(() => undefined)
            fail(400, 'File is larger than 500MB')
            return
          }

          const contentHash = digest.digest('hex')

          try {
            const existing = await prisma.audioLecture.findUnique({
              where: { contentHash },
              select: { id: true, title: true },
            })
            if (existing) {
              await unlink(filePath).catch(() => undefined)
              fail(409, duplicateMessage(existing.title), { existingId: existing.id })
              return
            }

            const durationSec = await getVideoDuration(filePath)
            const yearRaw = fields.year?.trim()
            const year = yearRaw ? Number.parseInt(yearRaw, 10) : null
            const title = fields.title?.trim() || path.parse(filename).name

            let playableSystemName = systemName
            try {
              const playable = await makeSpeechPlayable({
                originalPath: filePath,
                originalSystemName: systemName,
                originalSize: bytesWritten,
              })
              playableSystemName = playable.playableSystemName
              const lecture = await prisma.audioLecture.create({
                data: {
                  title,
                  year: Number.isInteger(year) ? year : null,
                  description: fields.description?.trim() || null,
                  originalName: filename,
                  fileName: systemName,
                  systemName,
                  playableSystemName: playable.playableSystemName,
                  contentHash,
                  mimeType: MIME_BY_EXT[ext] || info.mimeType || 'application/octet-stream',
                  size: bytesWritten,
                  playableSize: playable.playableSize,
                  durationSec: durationSec || null,
                  uploadedBy: uploader.userId,
                  isPublished: true,
                },
              })

              if (responded || res.headersSent) return
              responded = true
              res.status(200).json({
                ok: true,
                lecture: {
                  ...lecture,
                  size: Number(lecture.size),
                  playableSize:
                    lecture.playableSize == null ? null : Number(lecture.playableSize),
                },
              })
            } catch (error) {
              if (playableSystemName !== systemName) {
                await unlink(path.join(LIBRARY_DIR, path.basename(playableSystemName))).catch(
                  () => undefined
                )
              }
              throw error
            }
          } catch (error) {
            await unlink(filePath).catch(() => undefined)
            if (isUniqueConflict(error)) {
              const existing = await prisma.audioLecture.findUnique({
                where: { contentHash },
                select: { id: true, title: true },
              })
              if (existing) {
                fail(409, duplicateMessage(existing.title), { existingId: existing.id })
                return
              }
            }
            console.error('Audio library upload failed:', error)
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
