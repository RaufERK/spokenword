// app/api/status/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'

const execPromise = util.promisify(exec)

export async function GET() {
  try {
    const { stdout } = await execPromise(
      '/usr/bin/systemctl show -p ActiveState stream'
    )
    const state = stdout.split('=')[1].trim() // active | activating | failed …
    const streaming = state === 'active' || state === 'activating'

    return NextResponse.json({ streaming })
  } catch (error: any) {
    // ➌ Код выхода «3» означает, что служба не активна — это не ошибка API
    if (error?.code === 3) {
      return NextResponse.json({ streaming: false })
    }

    // ➍ Все прочие случаи — настоящая ошибка
    console.error('systemctl error:', error.stderr || error.message)
    return NextResponse.json({ streaming: false }, { status: 500 })
  }
}
