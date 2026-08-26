// app/api/users/[id]/admin/route.ts
import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'
import { ROLES, Role } from '@/lib/roles'

export async function PATCH(request: NextRequest) {
  const parts = new URL(request.url).pathname.split('/')
  const id = Number(parts.at(-2))

  const auth = await requireRole('SUPER')
  if (auth.error) return auth.error

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
