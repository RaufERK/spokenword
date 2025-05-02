// app/api/status/route.ts

import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'

const execPromise = util.promisify(exec)

// GET /api/status
export async function GET() {
  try {
    const { stdout } = await execPromise('systemctl is-active stream')
    const isActive = stdout.trim() === 'active'
    return NextResponse.json({ streaming: isActive })
  } catch {
    // Если служба не запущена, systemctl вернёт non‑zero → попадаем сюда
    return NextResponse.json({ streaming: false })
  }
}
