import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, requireUser } from '@/lib/require-auth'
import prisma from '@/lib/prisma'
import { canAccessPaidArchive } from '@/lib/subscription'
import fs from 'fs/promises'
import { createReadStream, statSync } from 'fs'
import path from 'path'

const CLASS_ARCHIVE_DIR = process.env.NODE_ENV === 'production'
  ? '/home/appuser/apps/spokenword/shared/public/class-archive'
  : path.resolve(process.cwd(), 'public/class-archive')

interface Props {
  params: Promise<{ systemName: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { systemName } = await params

    const auth = await requireUser()
    if (auth.error) return new NextResponse('Unauthorized', { status: 401 })
    if (!canAccessPaidArchive(auth.user.role, auth.user.accessUntil)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const file = await prisma.classFile.findUnique({ where: { systemName } })
    if (!file) {
      return new NextResponse('File not found', { status: 404 })
    }

    await prisma.classFile.update({
      where: { id: file.id },
      data: { views: { increment: 1 } },
    })

    const filePath = path.join(CLASS_ARCHIVE_DIR, systemName)

    try {
      const stat = statSync(filePath)
      const fileSize = stat.size
      const range = req.headers.get('range')

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = end - start + 1

        const stream = createReadStream(filePath, { start, end })

        return new NextResponse(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': 'video/mp4',
            'Cache-Control': 'public, max-age=31536000',
          },
        })
      }

      const stream = createReadStream(filePath)
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    } catch {
      return new NextResponse('File not accessible', { status: 404 })
    }
  } catch (error) {
    console.error('Class file stream error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const parts = url.pathname.split('/')
  const systemName = decodeURIComponent(parts[parts.length - 1])

  const auth = await requireStaff()
  if (auth.error) return auth.error

  const file = await prisma.classFile.findUnique({ where: { systemName } })
  if (!file) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })

  await prisma.classFile.delete({ where: { id: file.id } })

  const filePath = path.join(CLASS_ARCHIVE_DIR, systemName)
  try {
    await fs.unlink(filePath)
  } catch (e) {
    console.error(e)
  }

  return NextResponse.json({ ok: true })
}
