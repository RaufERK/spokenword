import { requireStaff } from '@/lib/require-auth'
import prisma from '@/lib/prisma'
import { canViewUserCredentials, type Role } from '@/lib/roles'
import { createLoginToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'

const PRIMARY = (process.env.PRIMARY_ORIGIN ?? 'https://spoken-word.ru').replace(/\/$/, '')
const MIRROR  = (process.env.MIRROR_ORIGIN  ?? 'https://spoken-word.info').replace(/\/$/, '')

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff()
  if (auth.error) return auth.error

  const { id: idStr } = await params
  const id = Number(idStr)
  const currentUserId = Number(auth.user.id)

  if (Number.isNaN(id) || Number.isNaN(currentUserId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, login: true, role: true, tokenVersion: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canViewUserCredentials({ id: currentUserId, role: auth.user.role as Role }, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = createLoginToken(user.id, user.tokenVersion)

  return NextResponse.json({
    token,
    urls: {
      ru: `${PRIMARY}/?token=${token}`,
      eu: `${MIRROR}/?token=${token}`,
    },
  })
}
