// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions, type User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma' // лучше создать один клиент
import { type JWT } from 'next-auth/jwt'
import { SessionStrategy } from 'next-auth'

type Role = 'USER' | 'ADMIN' | 'SUPER'

/* -------- типовые расширения — лучше поместить в   types/next-auth.d.ts ---- */
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
/* ------------------------------------------------------------------------- */

const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' satisfies SessionStrategy },

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
      // user?: User
      if (user) token.role = user.role
      return token satisfies JWT
    },
    session({ session, token }) {
      // session: Session, token: JWT
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST } // ✔ единственные экспорт-поля
