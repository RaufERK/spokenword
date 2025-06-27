/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/register/route.ts
import { normalizePhone } from '@/helpers/phone'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { slugify } from 'transliteration'

export async function POST(request: Request) {
  try {
    const data = await request.json() // firstName, …

    /* 1. логин */
    const base =
      slugify(data.firstName, { lowercase: false }) +
      slugify(data.lastName?.[0] ?? '', { lowercase: false })
    let login = base
    let i = 1
    while (await prisma.user.findUnique({ where: { login } })) {
      login = `${base}${++i}`
    }

    /* 2. телефон → нормализуем */
    const phone = normalizePhone(data.phone ?? '')
    if (!/^\d{11,15}$/.test(phone)) {
      return NextResponse.json({ error: 'phone' }, { status: 400 })
    }

    /* 3. пароль – 6 цифр */
    const password = crypto.randomInt(100000, 999999).toString()

    /* 4. запись в БД */
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        city: data.city,
        phoneNumber: phone,
        email: data.email,
        login,
        password,
      },
    })

    return NextResponse.json({ login, password, id: user.id })
  } catch (e: any) {
    /* дубликаты: phone/email/login */
    if (e.code === 'P2002') {
      return NextResponse.json(
        { error: 'duplicate', fields: e.meta?.target },
        { status: 409 }
      )
    }
    console.error(e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
