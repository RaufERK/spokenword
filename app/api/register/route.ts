import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { slugify } from 'transliteration'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  const data = await request.json() // firstName, lastName, phone, email, city

  /* 1. генерируем login */
  const base =
    slugify(data.firstName, { lowercase: false }) +
    slugify(data.lastName[0] ?? '', { lowercase: false })
  let login = base
  let i = 1
  while (await prisma.user.findUnique({ where: { login } })) {
    login = base + ++i // IvanP2, IvanP3, …
  }

  /* 2. пароль — 6 цифр */
  const password = crypto.randomInt(100000, 999999).toString()

  /* 3. создаём пользователя */
  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      phoneNumber: data.phone,
      email: data.email,
      login,
      password,
    },
  })

  return NextResponse.json({ login, password, id: user.id })
}
