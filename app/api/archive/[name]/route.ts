// app/api/archive/[name]/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
const ARCHIVE_DIR = '/srv/streaming/archive'

export async function DELETE(req: NextRequest) {
  const name = req.nextUrl.pathname.split('/').pop()

  if (!name) {
    return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
  }

  try {
    console.log(18, ARCHIVE_DIR, name)
    await fs.unlink(path.join(ARCHIVE_DIR, name))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
