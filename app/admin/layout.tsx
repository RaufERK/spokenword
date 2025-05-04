// ---------- app/admin/layout.tsx (оборачивает все admin‑маршруты, проверяет auth) ----------
import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import SideNav from '@/components/SideNav'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect('/login?next=/admin')

  return (
    <div className='flex min-h-screen'>
      <SideNav variant='admin' />
      <div className='flex-1 p-6 bg-gray-50'>{children}</div>
    </div>
  )
}
