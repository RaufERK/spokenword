// app/api/stop/route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

export async function POST() {
  try {
    await execPromise('sudo systemctl stop stream')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Ошибка остановки трансляции:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
