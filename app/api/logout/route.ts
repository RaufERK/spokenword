// app/api/logout/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.redirect('/')
  res.cookies.set({
    name: 'spoken_auth',
    value: '',
    maxAge: 0,
    path: '/',
  })
  return res
}
