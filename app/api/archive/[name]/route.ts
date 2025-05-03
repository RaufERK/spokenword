// 3 — удаление файлов из архива через админ‑панель
// 3.1 API‑ручка DELETE
// src/app/api/archive/[name]/route.ts (Next 15):
//     app/api/archive/[name]/route.ts


import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function DELETE(
  _req: Request,
  { params }: { params: { name: string } }
) {
  const archiveDir = '/var/stream/archive'
  const filePath = path.join(archiveDir, params.name)

  try {
    await fs.promises.unlink(filePath)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
