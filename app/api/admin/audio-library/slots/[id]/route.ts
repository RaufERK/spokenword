import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isStaffRole } from '@/lib/roles'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: idRaw } = await params
  const id = Number.parseInt(idRaw, 10)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const slot = await prisma.audioBroadcastSlot.findUnique({ where: { id } })
  if (!slot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (slot.status !== 'SCHEDULED') {
    return NextResponse.json({ error: 'Only scheduled slots can be cancelled' }, { status: 409 })
  }

  await prisma.audioBroadcastSlot.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
