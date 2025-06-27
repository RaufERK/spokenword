// app/profile/page.tsx
'use client'

import { Suspense } from 'react'
import ProfileClient from './ProfileClient'

export default function Page() {
  return (
    <Suspense fallback={<div className='p-10'>Загрузка...</div>}>
      <ProfileClient />
    </Suspense>
  )
}
