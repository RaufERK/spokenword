// lib/auth.ts
import type { NextAuthOptions, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'

export type Role = 'USER' | 'ADMIN' | 'SUPER'

/* ── расширяем типы NextAuth ─────────────────────────────────────── */
declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: { id: string; role: Role; name: string; email?: string | null }
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
  }
}
/* ────────────────────────────────────────────────────────────────── */

/** Конфигурация NextAuth (используем из разных файлов) */
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },

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
          role: user.role as Role,
          name: `${user.firstName} ${user.lastName}`,
        } satisfies User
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role as Role
      return token satisfies JWT
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as Role
      }
      return session
    },
  },
}
