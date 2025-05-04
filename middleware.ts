// ---------- middleware.ts (protect /admin/**) -------------
import { NextRequest, NextResponse } from 'next/server'
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const hasSession = req.cookies.has('spoken_auth')
    if (!hasSession) return NextResponse.redirect(new URL('/login', req.url))
  }
}
export const config = { matcher: ['/admin/:path*'] }
