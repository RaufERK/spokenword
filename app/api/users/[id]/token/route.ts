// app/api/users/[id]/token/route.ts
import prisma from '@/lib/prisma'
import { encryptToken } from '@/lib/token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
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
  const deployMode = process.env.APP_DEPLOY_MODE === 'mirror' ? 'mirror' : 'primary'
  const primaryOrigin = (process.env.PRIMARY_ORIGIN ?? 'https://spoken-word.ru').replace(/\/$/, '')
  const mirrorOrigin = (process.env.MIRROR_ORIGIN ?? 'https://spoken-word.info').replace(/\/$/, '')
  const publicOriginFromEnv = process.env.PUBLIC_ORIGIN?.replace(/\/$/, '')
  const requestOrigin = req.nextUrl.origin.replace(/\/$/, '')
  const currentOrigin = publicOriginFromEnv || requestOrigin || (deployMode === 'mirror' ? mirrorOrigin : primaryOrigin)

  const ruUrl = `${primaryOrigin}/profile?token=${token}`
  const euUrl = `${mirrorOrigin}/profile?token=${token}`
  const currentUrl = `${currentOrigin}/profile?token=${token}`

  return NextResponse.json({
    token,
    deployMode,
    currentUrl,
    urls: {
      ru: ruUrl,
      eu: euUrl,
    },
    comments: {
      ru: 'основной РФ домен',
      eu: 'EU mirror домен',
    },
  })
}
