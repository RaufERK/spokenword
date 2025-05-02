// app/api/status/route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'

const execPromise = util.promisify(exec)
const SERVICE = 'stream'

export async function GET() {
  try {
    // ➊ запрашиваем статус
    const { stdout } = await execPromise(
      `/usr/bin/sudo /usr/bin/systemctl is-active ${SERVICE}`
    )

    // ➋ «active» → true, всё остальное пусть считается false
    const streaming = stdout.trim() === 'active'
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
