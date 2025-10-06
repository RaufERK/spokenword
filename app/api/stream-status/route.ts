import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const streamKey = searchParams.get('key') || 'main'

    // Проверяем существование HLS плейлиста от SRS
    const hlsPath = path.join('/var/lib/srs/hls/live', streamKey + '.m3u8')

    try {
      await fs.access(hlsPath)

      // Проверяем, что файл не пустой и не слишком старый
      const stats = await fs.stat(hlsPath)
      const now = Date.now()
      const fileAge = now - stats.mtime.getTime()

      // Считаем стрим активным, если файл обновлялся в последние 30 секунд
      const isLive = fileAge < 30000 && stats.size > 0

      // Проверяем количество TS сегментов для определения стабильности
      const hlsDir = path.dirname(hlsPath)
      const files = await fs.readdir(hlsDir)
      const tsFiles = files.filter(
        (f) => f.startsWith(streamKey) && f.endsWith('.ts')
      )

      // Читаем плейлист для проверки количества сегментов
      const playlistContent = await fs.readFile(hlsPath, 'utf-8')
      const segmentLines = playlistContent
        .split('\n')
        .filter((line) => line.endsWith('.ts'))
      const segmentCount = segmentLines.length

      // Стрим считается молодым (прогревается) если:
      // - Меньше 8 сегментов (менее 16 секунд накоплено)
      // - ИЛИ только что обнаружен (файлы свежее 20 секунд)
      const fileAgeSeconds = fileAge / 1000
      const isNewStream = fileAgeSeconds < 20
      const isWarmingUp = segmentCount < 8 && isNewStream

      return NextResponse.json({
        isLive,
        streamKey,
        lastModified: stats.mtime.toISOString(),
        fileAge: Math.round(fileAge / 1000),
        isWarmingUp,
        segmentCount,
        tsFilesOnDisk: tsFiles.length,
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
