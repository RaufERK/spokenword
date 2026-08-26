import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const event = await prisma.event.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(event)
}
