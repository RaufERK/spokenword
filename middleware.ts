import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSubscriptionActive } from '@/lib/subscription'

const paidRoutes = ['/conf', '/conf-arch']
const protectedRoutes = ['/cabinet', '/paid-content', ...paidRoutes]
const adminOnlyRoutes = ['/users', '/admin']
const paidContentApiRoutes = ['/api/paid-content']

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = req.nextUrl

  // 1. Админ-маршруты (нужно быть залогиненным и роль ADMIN/SUPER)
  if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
    if (!token || (token.role !== 'ADMIN' && token.role !== 'SUPER')) {
      return NextResponse.redirect(new URL('/', req.url))
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

  // 5. Proxy upload requests to upload microservice
  if (pathname === '/api/conf-archive/upload' || pathname === '/api/admin/packages/upload') {
    // Check authorization
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role for conference uploads
    if (pathname === '/api/conf-archive/upload') {
      const allowedRoles = ['MODERATOR', 'ADMIN', 'SUPER']
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
      }
    }

    // Check role for package uploads
    if (pathname === '/api/admin/packages/upload') {
      const allowedRoles = ['ADMIN', 'SUPER']
      if (!allowedRoles.includes(token.role as string)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Proxy to upload service
    const uploadServiceUrl = `http://localhost:3006/upload${pathname.replace('/api', '')}`
    
    try {
      // Forward the request to upload service with auth info
      const headers = new Headers(req.headers)
      headers.set('x-user-id', String(token.sub || token.id))
      headers.set('x-user-role', String(token.role))

      const response = await fetch(uploadServiceUrl, {
        method: req.method,
        headers: headers,
        body: req.body,
        // @ts-ignore - duplex is needed for streaming
        duplex: 'half',
      })

      // Return the response from upload service
      return new NextResponse(response.body, {
        status: response.status,
        headers: response.headers,
      })
    } catch (error) {
      console.error('Upload service proxy error:', error)
      return NextResponse.json(
        { error: 'Upload service unavailable' },
        { status: 503 }
      )
    }
  }

  // Публичные страницы — всегда доступны
  return NextResponse.next()
}
