import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

type ReorderItem = {
  type: 'conf' | 'class'
  id: number
  orderIndex: number
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role || ''

  if (!['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { items }: { items: ReorderItem[] } = await req.json()

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const confItems = items.filter((i) => i.type === 'conf')
  const classItems = items.filter((i) => i.type === 'class')

  await Promise.all([
    ...confItems.map((i) =>
      prisma.conferenceFile.update({
        where: { id: i.id },
        data: { orderIndex: i.orderIndex },
      })
    ),
    ...classItems.map((i) =>
      prisma.classFile.update({
        where: { id: i.id },
        data: { orderIndex: i.orderIndex },
      })
    ),
  ])

  return NextResponse.json({ ok: true })
}
