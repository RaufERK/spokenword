import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export async function GET() {
  try {
    const { stdout } = await execPromise('systemctl is-active stream')
    const isActive = stdout.trim() === 'active'
    return NextResponse.json({ streaming: isActive })
  } catch (error) {
    console.error('Ошибка при проверке статуса stream.service:', error)
    return NextResponse.json({ streaming: false })
  }
}
