import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export async function GET() {
  try {
    const { stdout } = await execPromise('systemctl is-active stream')
    const isActive = stdout.trim() === 'active'
    return NextResponse.json({ streaming: isActive })
  } catch (error: unknown) {
    // Даже если статус не "active", это не считается критической ошибкой
    console.error(error)
    return NextResponse.json({ streaming: false })
  }
}
