/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)
const SYSTEMCTL = '/usr/bin/systemctl' // <-- абсолютный путь

export async function GET() {
  try {
    // -n = non-interactive; sudo сразу завершится, если всё-таки попросит пароль
    const { stdout } = await execPromise(
      `sudo -n ${SYSTEMCTL} is-active stream.service`
    )
    const isActive = stdout.trim() === 'active'
    return NextResponse.json({ streaming: isActive })
  } catch (error: any) {
    console.error('systemctl error:', error.stderr ?? error)
    return NextResponse.json({ streaming: false })
  }
}
