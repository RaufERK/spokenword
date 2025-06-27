// app/api/archive/route.ts
import { ARCHIVE_DIR } from '@/data'
import fs from 'fs'
import { NextResponse } from 'next/server'

const exts = ['.mp4'] // ← разрешённые расширения

export async function GET() {
  try {
    const files = fs
      .readdirSync(ARCHIVE_DIR)
      .filter((f) => exts.some((e) => f.endsWith(e)))
      .sort()
      .reverse()

    return NextResponse.json(files)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Не удалось прочитать архив', err },
      { status: 500 }
    )
  }
}
