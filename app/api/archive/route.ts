// app/api/archive/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const archiveDir = '/srv/streaming/archive'

  try {
    const files = fs
      .readdirSync(archiveDir)
      .filter((f) => f.endsWith('.mp4'))
      .map((f) => {
        const filePath = path.join(archiveDir, f)
        const stats = fs.statSync(filePath)
        return {
          name: f,
          size: stats.size,
          modified: stats.mtime,
          url: `/archive/${f}`, // nginx уже отдаёт новый alias
        }
      })
      .sort((a, b) => +b.modified - +a.modified)

    return NextResponse.json(files)
  } catch (e) {
    console.error('Ошибка чтения архива:', e)
    return NextResponse.json(
      { error: 'Не удалось прочитать архив' },
      { status: 500 }
    )
  }
}
