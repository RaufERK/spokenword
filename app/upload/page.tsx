// app/upload/page.tsx
'use client'

import { useSession } from 'next-auth/react'

export default function UploadPage() {
  const { data } = useSession()
  const role = data?.user?.role

  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return (
      <div className='p-10 text-red-600'>
        Нет доступа. Только для модераторов и выше.
      </div>
    )
  }

  // Заглушка — тут будет форма загрузки файлов
  return (
    <div className='p-10 max-w-md mx-auto bg-indigo-800 rounded-2xl shadow'>
      <h1 className='text-2xl mb-6 font-bold text-center text-blue-500'>
        Загрузка файлов в архив конференции
      </h1>
      <div className='text-white text-center'>
        (Тут будет форма загрузки файлов — скоро!)
      </div>
    </div>
  )
}
