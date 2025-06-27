// app/api/users/[id]/admin/route.ts
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { ROLES, Role } from '@/lib/roles'

export async function PATCH(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/')
  const id = Number(parts.at(-2))

  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'SUPER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { role } = (await request.json()) as { role: Role }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  // SUPER нельзя назначить вручную (только оставить тем, кто уже SUPER)
  if (role === 'SUPER') {
    return NextResponse.json({ error: 'Cannot assign SUPER' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
  })

  return NextResponse.json({ role: user.role })
}
