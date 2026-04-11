import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSubscriptionActive } from '@/lib/subscription'

const paidRoutes = ['/conf', '/class', '/watch-class', '/watch-conf']
const protectedRoutes = ['/cabinet', '/paid-content', '/chat', '/conf-arch', ...paidRoutes]
const adminOnlyRoutes = ['/admin/packages']
const paidContentApiRoutes = ['/api/paid-content']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const nextActionHeader = req.headers.get('next-action')

  if (nextActionHeader) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 })
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // 1. Все /admin/* — только для MODERATOR/ADMIN/SUPER
  if (pathname.startsWith('/admin')) {
    if (!token || !['MODERATOR', 'ADMIN', 'SUPER'].includes(token.role as string)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
      if (!['ADMIN', 'SUPER'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    }
  }

  // 2. Платные маршруты (нужно быть залогиненным + подписка)
  if (paidRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER'] as const
    const userRole = token.role

    if (
      typeof userRole !== 'string' ||
      !allowedRoles.includes(userRole as (typeof allowedRoles)[number])
    ) {
      const accessUntil =
        token && typeof token === 'object' && 'accessUntil' in token
          ? (token.accessUntil as string | null)
          : null

      if (!isSubscriptionActive(accessUntil)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  }

  // 3. API платного контента
  if (paidContentApiRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }

  // 4. Прочие защищённые маршруты (только авторизация)
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // 5. Авторизация для upload-запросов (Nginx проксирует на upload service)
  const uploadRoutes = [
    '/api/conf-archive/upload',
    '/api/admin/packages/upload',
    '/api/class/upload',
  ]
  if (uploadRoutes.includes(pathname)) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (pathname === '/api/conf-archive/upload' || pathname === '/api/class/upload') {
      if (!['MODERATOR', 'ADMIN', 'SUPER'].includes(token.role as string)) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
      }
    }

    if (pathname === '/api/admin/packages/upload') {
      if (!['ADMIN', 'SUPER'].includes(token.role as string)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', String(token.sub || token.id))
    requestHeaders.set('x-user-role', String(token.role))

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/conf/:path*',
    '/class/:path*',
    '/watch-class/:path*',
    '/watch-conf/:path*',
    '/cabinet',
    '/paid-content/:path*',
    '/chat',
    '/conf-arch',
    '/api/paid-content/:path*',
    '/api/conf-archive/upload',
    '/api/admin/packages/upload',
    '/api/class/upload',
  ],
}
