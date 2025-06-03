// app/api/archive/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const ARCHIVE_DIR = '/srv/streaming/archive'
const SAFE_EXT = '.mp4'

export async function DELETE(req: NextRequest) {
  const raw = decodeURIComponent(req.nextUrl.pathname.split('/').pop() ?? '')
  const name = path.basename(raw)
  if (!name.endsWith(SAFE_EXT)) {
    return NextResponse.json({ error: 'bad file' }, { status: 400 })
  }

  try {
    await fs.unlink(path.join(ARCHIVE_DIR, name))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
