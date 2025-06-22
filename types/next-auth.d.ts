// types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'USER' | 'ADMIN' | 'SUPER'
      name: string
      email?: string | null
    }
  }

  interface JWT {
    role: 'USER' | 'ADMIN' | 'SUPER'
  }
}
