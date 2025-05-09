// app/api/archive/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'

export async function GET() {
  const archiveDir = '/srv/streaming/archive'

  try {
    const files = fs
      .readdirSync(archiveDir)
      .filter((f) => f.endsWith('.mp4'))
      .sort() // по имени / времени – как нужно
      .reverse() // новое сверху

    return NextResponse.json(files) // ← массив строк, не объект!
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: 'Не удалось прочитать архив' },
      { status: 500 }
    )
  }
}
