/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/start/route.ts
import { NextResponse } from 'next/server'
import { exec } from 'node:child_process'
import util from 'node:util'

const execPromise = util.promisify(exec)

// POST /api/start
export async function POST() {
  try {
    await execPromise('/usr/bin/sudo /usr/bin/systemctl start stream')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Ошибка запуска трансляции:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
