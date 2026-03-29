import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSubscriptionActive } from '@/lib/subscription'

const paidRoutes = ['/conf', '/conf-arch', '/class', '/watch-class']
const protectedRoutes = ['/cabinet', '/paid-content', ...paidRoutes]
// Только для ADMIN/SUPER (управление пакетами — финансы)
const adminOnlyRoutes = ['/admin/packages']
const paidContentApiRoutes = ['/api/paid-content']

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // 1. Все /admin/* — только для MODERATOR/ADMIN/SUPER
  if (pathname.startsWith('/admin')) {
    if (!token || !['MODERATOR', 'ADMIN', 'SUPER'].includes(token.role as string)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    // Подразделы /admin/users и /admin/packages — только ADMIN/SUPER
    if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
      if (!['ADMIN', 'SUPER'].includes(token.role as string)) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    }
  }

  // 2. Платные маршруты (нужно быть залогиненным)
  if (paidRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER'] as const
    const userRole = token.role

    // Если роль не MODERATOR/ADMIN/SUPER — проверяем оплату
    if (
      typeof userRole !== 'string' ||
      !allowedRoles.includes(userRole as any)
    ) {
      const paymentDate =
        token && typeof token === 'object' && 'paymentDate' in token
          ? (token.paymentDate as string | Date | null)
          : null

      if (!isSubscriptionActive(paymentDate)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  }

  // 3. API платного контента (требует авторизации, доступ проверяется внутри)
  if (paidContentApiRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }

  // 4. Прочие защищённые маршруты (требуют только авторизации)
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // 5. Check authorization for upload requests (Nginx will proxy to upload service)
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
      const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER']
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
      }
    }

    if (pathname === '/api/admin/packages/upload') {
      const allowedRoles = ['ADMIN', 'SUPER']
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', String(token.sub || token.id))
    requestHeaders.set('x-user-role', String(token.role))

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Публичные страницы — всегда доступны
  return NextResponse.next()
}
