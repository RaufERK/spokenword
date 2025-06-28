// app/conf-arch/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import ArchiveConfList from '@/components/ArchiveConfList'

export default function ConfArchPage() {
  const { data } = useSession()
  const role = data?.user?.role
  const canDelete = role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER'

  return (
    <main className='p-4 max-w-4xl mx-auto'>
      <h1 className='text-2xl font-semibold mb-4'>Архив конференций</h1>
      <ArchiveConfList canDelete={canDelete} />
    </main>
  )
}
