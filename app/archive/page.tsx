'use client'

import { useSession } from 'next-auth/react'
import ArchiveList from '@/components/ArchiveList'

export default function ArchivePage() {
  const { data } = useSession()
  const role = data?.user?.role

  // Доступно для MODERATOR, ADMIN, SUPER
  const canDelete = role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER'

  return (
    <main className='p-4 max-w-4xl mx-auto'>
      <h1 className='text-2xl font-semibold mb-4'>Архив трансляций</h1>
      <ArchiveList canDelete={canDelete} />
    </main>
  )
}
