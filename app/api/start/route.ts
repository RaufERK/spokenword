// app/api/start/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'
import { writeFile } from 'fs/promises'

const execPromise = util.promisify(exec)

// POST /api/start
export async function POST() {
  try {
    // создаём флаг
    await writeFile('/tmp/streaming-enabled', '')

    // запускаем systemd
    await execPromise('/usr/bin/sudo /usr/bin/systemctl start stream')

    // проверяем статус
    const { stdout } = await execPromise('systemctl is-active stream')
    return NextResponse.json({ success: stdout.trim() === 'active' })
  } catch (error: any) {
    console.error('Ошибка запуска трансляции:', error.stderr || error.message)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
