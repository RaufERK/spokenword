// app/api/archive/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
const exts = ['.mp4'] // ← разрешённые расширения

export async function GET() {
  const archiveDir = '/srv/streaming/archive'

  try {
    const files = fs
      .readdirSync(archiveDir)
      .filter((f) => exts.some((e) => f.endsWith(e)))
      .sort()
      .reverse()

    return NextResponse.json(files) // ← массив строк, не объект!
  } catch (e) {
    console.error(e)
    return NextResponse.json(
      { error: 'Не удалось прочитать архив' },
      { status: 500 }
    )
  }
}
