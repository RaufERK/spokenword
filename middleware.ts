import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const USERNAME = process.env.ADMIN_USER || 'admin'
const PASSWORD = process.env.ADMIN_PASS || 'secret'

export function middleware(request: NextRequest) {
  const basicAuth = request.headers.get('authorization')

  if (!basicAuth) {
    return new Response('Требуется авторизация', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  const authValue = basicAuth.split(' ')[1]
  const [user, pass] = atob(authValue).split(':')

  if (user !== USERNAME || pass !== PASSWORD) {
    return new Response('Неверные учетные данные', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
