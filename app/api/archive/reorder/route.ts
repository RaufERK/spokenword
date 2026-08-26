import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-auth'
import prisma from '@/lib/prisma'

type ReorderItem = {
  type: 'conf' | 'class'
  id: number
  orderIndex: number
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff()
  if (auth.error) return auth.error

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
