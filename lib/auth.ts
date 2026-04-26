import prisma from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import type { Role } from '@/lib/roles'

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
    password?: string | null
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
    password?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.login || !creds.password) return null
        const user = await prisma.user.findUnique({
          where: { login: creds.login },
        })
        if (!user || user.password !== creds.password) return null

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
          password: user.password,
        }
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
        token.password = user.password ?? null
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
            password: true,
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
          token.password = dbUser.password
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
        password: token.password as string | null,
      }
      return session
    },
  },
}
