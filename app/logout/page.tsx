/* eslint-disable @typescript-eslint/no-explicit-any */
// app/logout/page.tsx
// app/logout/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function LogoutPage() {
  const cookieStore = cookies() as any // временно обходим типизацию
  cookieStore.delete('spoken_auth')
  redirect('/')
}
