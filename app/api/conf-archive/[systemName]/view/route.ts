// app/api/conf-archive/[systemName]/view/route.ts

import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ systemName: string }> }
) {
  const { systemName } = await context.params
  try {
    await prisma.conferenceFile.update({
      where: { systemName },
      data: { views: { increment: 1 } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
}
