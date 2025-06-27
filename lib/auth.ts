import prisma from '@/lib/prisma'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export type Role = 'USER' | 'ADMIN' | 'SUPER'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
    firstName: string
    lastName: string
    phoneNumber: string | null // <-- так!
    login: string
    email?: string | null
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
    phoneNumber: string | null // <-- так!
    login: string
    email?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Login', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(creds) {
        if (!creds?.login || !creds.password) return null
        const user = await prisma.user.findUnique({
          where: { login: creds.login }
        })
        if (!user || user.password !== creds.password) return null

        return {
          id: String(user.id),
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber, // <-- важно!
          login: user.login,
          email: user.email
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phoneNumber = user.phoneNumber
        token.login = user.login
        token.email = user.email
      }
      return token
    },
    session({ session, token }) {
      session.user = {
        id: token.id as string,
        role: token.role as Role,
        firstName: token.firstName as string,
        lastName: token.lastName as string,
        phoneNumber: token.phoneNumber as string | null, // <-- важно!
        login: token.login as string,
        email: token.email as string | null,
        name: `${token.firstName} ${token.lastName}`
      }
      return session
    }
  }
}
