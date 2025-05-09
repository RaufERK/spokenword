// удаление файлов из архива через админ‑панель
// app/api/archive/[name]/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> } // ← Promise!
) {
  const { name } = await params // распаковали

  const archiveDir = '/srv/streaming/archive'

  const filePath = path.join(archiveDir, name)

  try {
    await fs.promises.unlink(filePath)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
