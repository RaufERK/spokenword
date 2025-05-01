// src/app/api/archive/route.ts

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const archiveDir = path.join(process.cwd(), 'public', 'archive')

  try {
    const files = fs
      .readdirSync(archiveDir)
      .filter((file) => file.endsWith('.mp4'))
      .map((file) => {
        const filePath = path.join(archiveDir, file)
        const stats = fs.statSync(filePath)
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          url: `/archive/${file}`, // путь, по которому можно проигрывать
        }
      })
      .sort((a, b) => +b.modified - +a.modified) // последние сверху

    return NextResponse.json({ files })
  } catch (err) {
    console.error('Ошибка чтения архива:', err)
    return NextResponse.json(
      { error: 'Не удалось прочитать архив' },
      { status: 500 }
    )
  }
}
