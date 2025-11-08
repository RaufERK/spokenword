import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync } from 'fs'
import { join } from 'path'

interface Props {
  params: Promise<{ packageId: string; itemId: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { packageId: packageIdStr, itemId: itemIdStr } = await params
    const packageId = parseInt(packageIdStr)
    const itemId = parseInt(itemIdStr)
    const userId = parseInt(session.user.id)

    if (isNaN(packageId) || isNaN(itemId)) {
      return new NextResponse('Invalid parameters', { status: 400 })
    }

    // Проверяем права доступа
    const hasModeratorAccess = ['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)
    
    if (!hasModeratorAccess) {
      // Обычный пользователь - проверяем покупку
      const access = await prisma.userPackageAccess.findUnique({
        where: {
          userId_packageId: { userId, packageId }
        }
      })

      if (!access) {
        return new NextResponse('Access denied', { status: 403 })
      }
    }

    // Находим файл
    const item = await prisma.packageItem.findFirst({
      where: {
        id: itemId,
        packageId: packageId
      }
    })

    if (!item) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Путь к файлу
    const filePath = join(process.cwd(), item.filePath.replace(/^\//, ''))
    
    try {
      const stat = statSync(filePath)
      const fileSize = stat.size
      const range = req.headers.get('range')

      // Определяем MIME тип
      const mimeType = item.fileName.endsWith('.mp4') ? 'video/mp4' : 
                     item.fileName.endsWith('.avi') ? 'video/x-msvideo' :
                     item.fileName.endsWith('.mov') ? 'video/quicktime' :
                     item.fileName.endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4'

      if (range) {
        // Range request для стриминга
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = (end - start) + 1

        const stream = createReadStream(filePath, { start, end })

        return new NextResponse(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      } else {
        // Полный файл
        const stream = createReadStream(filePath)

        return new NextResponse(stream as unknown as ReadableStream, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }

    } catch (fileError) {
      console.error('File access error:', fileError)
      return new NextResponse('File not accessible', { status: 404 })
    }

  } catch (error) {
    console.error('Stream error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
