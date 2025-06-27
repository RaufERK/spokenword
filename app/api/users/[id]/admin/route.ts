// app/api/users/[id]/admin/route.ts
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/')
  const id = Number(parts.at(-2))

  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { makeAdmin } = (await request.json()) as { makeAdmin: boolean }

  const user = await prisma.user.update({
    where: { id },
    data: { role: makeAdmin ? 'ADMIN' : 'USER' },
  })

  return NextResponse.json({ role: user.role })
}
