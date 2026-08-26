import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/require-auth'
import { canAccessEventFile } from '@/lib/subscription'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ systemName: string }> }
) {
  const { systemName } = await context.params
  const auth = await requireUser()
  if (auth.error) return auth.error

  const file = await prisma.classFile.findUnique({ where: { systemName } })
  if (!file) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const allowed = await canAccessEventFile({
    role: auth.user.role,
    userId: Number(auth.user.id),
    eventId: file.eventId,
    isPublic: file.isPublic,
  })
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.classFile.update({
    where: { id: file.id },
    data: { views: { increment: 1 } },
  })
  return NextResponse.json({ ok: true })
}
