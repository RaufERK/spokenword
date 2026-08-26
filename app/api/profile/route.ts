import { normalizeEmail } from '@/helpers/email'
import { normalizePhone } from '@/helpers/phone'
import { hashPassword, verifyPassword } from '@/lib/password'
import { requireUser } from '@/lib/require-auth'
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

type ProfilePayload = {
  profileId?: number | string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  email?: string
  city?: string
  currentPassword?: string
  newPassword?: string
}

const nameRegex = /[а-яёА-ЯЁa-zA-Z]/

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function serializeUser(user: {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string | null
  email: string | null
  city: string | null
  login: string
  role: string
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    city: user.city,
    login: user.login,
    role: user.role,
  }
}

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const userId = Number(auth.user.id)
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      city: true,
      login: true,
      role: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ user: serializeUser(user) })
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const userId = Number(auth.user.id)
    const body = (await request.json()) as ProfilePayload
    const profileId = Number(body.profileId)

    if (!Number.isInteger(profileId) || profileId !== userId) {
      return NextResponse.json({ error: 'profileMismatch' }, { status: 403 })
    }

    const firstName = cleanText(body.firstName)
    const lastName = cleanText(body.lastName)
    const phoneNumber = normalizePhone(cleanText(body.phoneNumber))
    const email = normalizeEmail(cleanText(body.email))
    const city = cleanText(body.city)
    const currentPassword = cleanText(body.currentPassword)
    const newPassword = cleanText(body.newPassword)

    if (firstName.length < 2 || !nameRegex.test(firstName)) {
      return NextResponse.json({ error: 'firstName' }, { status: 400 })
    }

    if (lastName.length < 2 || !nameRegex.test(lastName)) {
      return NextResponse.json({ error: 'lastName' }, { status: 400 })
    }

    if (!/^\d{11,15}$/.test(phoneNumber)) {
      return NextResponse.json({ error: 'phoneNumber' }, { status: 400 })
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'email' }, { status: 400 })
    }

    if (newPassword && !/^\d{6}$/.test(newPassword)) {
      return NextResponse.json({ error: 'newPassword' }, { status: 400 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (newPassword && !(await verifyPassword(currentPassword, currentUser.password))) {
      return NextResponse.json({ error: 'currentPassword' }, { status: 400 })
    }

    const existingEmailUser = email
      ? await prisma.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            NOT: { id: userId },
          },
          select: { id: true },
        })
      : null

    if (existingEmailUser) {
      return NextResponse.json(
        { error: 'duplicate', fields: ['email'] },
        { status: 409 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber,
        email: email || null,
        city: city || null,
        ...(newPassword
          ? { password: await hashPassword(newPassword), tokenVersion: { increment: 1 } }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        city: true,
        login: true,
        role: true,
      },
    })

    return NextResponse.json({ user: serializeUser(user) })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const target = 'meta' in error && typeof error.meta === 'object' && error.meta
        ? (error.meta as { target?: string[] }).target
        : undefined
      return NextResponse.json({ error: 'duplicate', fields: target }, { status: 409 })
    }

    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
