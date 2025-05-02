/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/start/route.ts
import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'

const execPromise = util.promisify(exec)

// POST /api/start
export async function POST() {
  try {
    // app/api/start/route.ts
    await execPromise('/usr/bin/sudo /usr/bin/systemctl start stream')
    const { stdout } = await execPromise('systemctl is-active stream')
    return NextResponse.json({ success: stdout.trim() === 'active' })
  } catch (error: any) {
    console.error('systemctl error:', error.stderr || error.message)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
