import prisma from '@/lib/prisma'
import { encryptToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'

const PRIMARY = (process.env.PRIMARY_ORIGIN ?? 'https://spoken-word.ru').replace(/\/$/, '')
const MIRROR  = (process.env.MIRROR_ORIGIN  ?? 'https://spoken-word.info').replace(/\/$/, '')

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = Number(idStr)

  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = encryptToken({ login: user.login, password: user.password })

  return NextResponse.json({
    token,
    urls: {
      ru: `${PRIMARY}/profile?token=${token}`,
      eu: `${MIRROR}/profile?token=${token}`,
    },
  })
}
