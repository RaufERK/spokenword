import { NextResponse } from 'next/server'

const streaming = false // мок-переменная

export async function GET() {
  return NextResponse.json({ streaming })
}
