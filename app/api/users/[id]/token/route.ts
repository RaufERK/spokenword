import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import type { Role } from '@/lib/roles'
import { encryptToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

const PRIMARY = (process.env.PRIMARY_ORIGIN ?? 'https://spoken-word.ru').replace(/\/$/, '')
const MIRROR  = (process.env.MIRROR_ORIGIN  ?? 'https://spoken-word.info').replace(/\/$/, '')
const ADMIN_ROLES: Role[] = ['MODERATOR', 'ADMIN', 'SUPER']

function canCreateProfileLink(currentRole: Role, currentUserId: number, targetUser: { id: number; role: Role }) {
  if (currentRole === 'SUPER') return true
  if (targetUser.role === 'USER') return true
  return targetUser.id === currentUserId
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  const currentUserId = Number(session.user.id)

  if (Number.isNaN(id) || Number.isNaN(currentUserId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, login: true, password: true, role: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canCreateProfileLink(session.user.role, currentUserId, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = encryptToken({ login: user.login, password: user.password })

  return NextResponse.json({
    token,
    urls: {
      ru: `${PRIMARY}/?token=${token}`,
      eu: `${MIRROR}/?token=${token}`,
    },
  })
}
