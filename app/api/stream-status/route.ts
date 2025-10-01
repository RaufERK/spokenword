import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const streamKey = searchParams.get('key') || 'main'

    // Проверяем существование HLS плейлиста (360p single profile)
    const hlsPath = path.join('/srv/streaming/hls', streamKey, 'index.m3u8')

    try {
      await fs.access(hlsPath)

      // Проверяем, что файл не пустой и не слишком старый
      const stats = await fs.stat(hlsPath)
      const now = Date.now()
      const fileAge = now - stats.mtime.getTime()

      // Считаем стрим активным, если файл обновлялся в последние 30 секунд
      const isLive = fileAge < 30000 && stats.size > 0

      return NextResponse.json({
        isLive,
        streamKey,
        lastModified: stats.mtime.toISOString(),
        fileAge: Math.round(fileAge / 1000),
      })
    } catch {
      // Файл не существует
      return NextResponse.json({
        isLive: false,
        streamKey,
        error: 'Stream not found',
      })
    }
  } catch (error) {
    console.error('Error checking stream status:', error)
    return NextResponse.json(
      { error: 'Failed to check stream status' },
      { status: 500 }
    )
  }
}
