import { NextResponse } from 'next/server';

let streaming = false; // мок-переменная

export async function GET() {
  return NextResponse.json({ streaming });
}
