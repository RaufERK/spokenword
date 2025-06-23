// middleware.ts
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// список защищённых маршрутов
const protectedRoutes = ['/cabinet', '/conf', '/conf-arch']
const adminOnlyRoutes = ['/users']

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  const { pathname } = req.nextUrl

  // Проверка на защищённые роуты
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAdminOnly = adminOnlyRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAdminOnly) {
    if (!token || (token.role !== 'ADMIN' && token.role !== 'SUPER')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}
