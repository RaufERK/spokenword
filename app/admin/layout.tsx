// app/admin/layout.tsx

import { ReactNode } from 'react'
// import { redirect } from 'next/navigation'
// import { getSession } from '@/lib/auth-server'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  // const session = await getSession()
  // if (!session?.user) redirect('/login?next=/admin')

  return (
    <>
      <main className='p-6 bg-blue-950 min-h-screen'>{children}</main>
    </>
  )
}
