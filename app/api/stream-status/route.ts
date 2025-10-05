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

      // Стрим считается "молодым" если сегментов меньше 8 (менее 16 секунд)
      // или если файлов на диске меньше ожидаемого
      const isWarmingUp = segmentCount < 8 || tsFiles.length < 6
      const streamAge = Math.min(segmentCount * 2, fileAge / 1000)

      return NextResponse.json({
        isLive,
        streamKey,
        lastModified: stats.mtime.toISOString(),
        fileAge: Math.round(fileAge / 1000),
        isWarmingUp,
        segmentCount,
        streamAge: Math.round(streamAge),
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
