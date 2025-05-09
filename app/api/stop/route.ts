// app/api/status/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'
import { unlink } from 'fs/promises'

const execPromise = util.promisify(exec)

// POST /api/stop
export async function POST() {
  try {
    // удаляем флаг — ffmpeg сам завершится
    await unlink('/tmp/streaming-enabled')

    // останавливаем службу (на всякий случай)
    await execPromise('/usr/bin/sudo /usr/bin/systemctl stop stream')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Ошибка остановки трансляции:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
