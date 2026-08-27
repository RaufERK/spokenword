import { audioLibraryFilePath } from '@/lib/audio-library'
import prisma from '@/lib/prisma'
import { requireStaff } from '@/lib/require-auth'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

const MIME_BY_EXT: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  const auth = await requireStaff()
  if (auth.error) return auth.error

  const { id: idRaw } = await params
  const id = Number.parseInt(idRaw, 10)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const lecture = await prisma.audioLecture.findUnique({
    where: { id },
    select: { systemName: true, mimeType: true },
  })
  if (!lecture) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = audioLibraryFilePath(lecture.systemName)
  if (!filePath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size
    const ext = path.extname(lecture.systemName).toLowerCase()
    const mimeType = MIME_BY_EXT[ext] || lecture.mimeType || 'application/octet-stream'
    const range = req.headers.get('range')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = Number.parseInt(parts[0], 10)
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        })
      }
      const stream = createReadStream(filePath, { start, end })
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'Content-Type': mimeType,
        },
      })
    }

    const stream = createReadStream(filePath)
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(fileSize),
        'Content-Type': mimeType,
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not accessible' }, { status: 404 })
  }
}
