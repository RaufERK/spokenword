import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isSubscriptionActive } from '@/lib/subscription'

const paidRoutes = ['/conf', '/conf-arch']
const protectedRoutes = ['/cabinet', ...paidRoutes]
const adminOnlyRoutes = ['/users', '/admin']

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

  // 3. Прочие защищённые маршруты (требуют только авторизации)
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Публичные страницы — всегда доступны
  return NextResponse.next()
}
