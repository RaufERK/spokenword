import prisma from '@/lib/prisma'
import { consumeRateLimit } from '@/lib/rate-limit'
import type { Role } from '@/lib/roles'
import { matchesLoginToken, readLoginToken } from '@/lib/token'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import { normalizeEmail } from '@/helpers/email'
import { normalizePhone } from '@/helpers/phone'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
    firstName: string
    lastName: string
    phoneNumber: string | null
    login: string
    email?: string | null
    city?: string | null
    accessUntil?: string | null
  }
  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    firstName: string
    lastName: string
    phoneNumber: string | null
    login: string
    email?: string | null
    city?: string | null
    accessUntil?: string | null
  }
}

const LOGIN_ATTEMPTS = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAGIC_ATTEMPTS = 20
const MAGIC_WINDOW_MS = 15 * 60 * 1000

function toSessionUser(user: {
  id: number
  role: Role
  firstName: string
  lastName: string
  phoneNumber: string | null
  login: string
  email: string | null
  city: string | null
  accessUntil: Date | null
}) {
  return {
    id: String(user.id),
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    login: user.login,
    email: user.email,
    city: user.city,
    accessUntil: user.accessUntil ? user.accessUntil.toISOString() : null,
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        password: { label: 'Password', type: 'password' },
        magicToken: { label: 'Magic token', type: 'text' },
      },
      async authorize(creds) {
        const magicToken = typeof creds?.magicToken === 'string' ? creds.magicToken.trim() : ''

        if (magicToken) {
          const allowed = await consumeRateLimit(
            `magic:${magicToken.slice(0, 32)}`,
            MAGIC_ATTEMPTS,
            MAGIC_WINDOW_MS
          )
          if (!allowed) return null

          try {
            const payload = readLoginToken(magicToken)
            const user = await prisma.user.findUnique({ where: { id: payload.userId } })
            if (!user || !matchesLoginToken(payload, user.id, user.password)) return null
            return toSessionUser(user)
          } catch {
            return null
          }
        }

        if (!creds?.login || !creds.password) return null

        const identifier = creds.login.trim()
        const allowed = await consumeRateLimit(
          `login:${identifier.toLowerCase()}`,
          LOGIN_ATTEMPTS,
          LOGIN_WINDOW_MS
        )
        if (!allowed) return null

        const email = normalizeEmail(identifier)
        const phoneNumber = normalizePhone(identifier)
        let user = await prisma.user.findUnique({
          where: { login: identifier },
        })

        if (!user && email.includes('@')) {
          user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          })
        }

        if (!user && /^\d{11,15}$/.test(phoneNumber)) {
          user = await prisma.user.findUnique({
            where: { phoneNumber },
          })
        }

        if (!user || user.password !== creds.password) return null

        return toSessionUser(user)
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phoneNumber = user.phoneNumber
        token.login = user.login
        token.email = user.email
        token.city = user.city ?? null
        token.accessUntil = user.accessUntil ?? null
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.id) },
          select: {
            role: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            login: true,
            email: true,
            city: true,
            accessUntil: true,
          },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.firstName = dbUser.firstName
          token.lastName = dbUser.lastName
          token.phoneNumber = dbUser.phoneNumber
          token.login = dbUser.login
          token.email = dbUser.email
          token.city = dbUser.city
          token.accessUntil = dbUser.accessUntil ? dbUser.accessUntil.toISOString() : null
        }
      }
      return token
    },
    session({ session, token }) {
      session.user = {
        id: token.id as string,
        role: token.role as Role,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        phoneNumber: token.phoneNumber as string | null,
        login: token.login as string,
        email: token.email as string | null,
        city: token.city as string | null,
        name: `${token.firstName} ${token.lastName}`,
        accessUntil: token.accessUntil as string | null,
      }
      return session
    },
  },
}
