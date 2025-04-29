import { NextResponse } from 'next/server'

let streaming = false // мок-переменная

export async function POST() {
  streaming = false
  return NextResponse.json({ success: true })
}
