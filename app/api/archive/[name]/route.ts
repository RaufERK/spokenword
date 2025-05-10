import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const filePath = path.join('/srv/streaming/archive', params.name)

  try {
    await fs.unlink(filePath)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
