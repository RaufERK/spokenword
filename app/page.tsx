// app/page.tsx
'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8 text-black'>
      <h1 className='text-3xl font-bold mb-8'>SpokenWord — навигация</h1>

      <div className='flex flex-col gap-6 w-full max-w-xs'>
        <Link
          href='/admin'
          className='block w-full text-center rounded bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg font-semibold'
        >
          Управление трансляцией (Admin)
        </Link>

        <Link
          href='/live'
          className='block w-full text-center rounded bg-green-500 hover:bg-green-600 text-white py-3 text-lg font-semibold'
        >
          Прямая трансляция (Live)
        </Link>

        <Link
          href='/archive'
          className='block w-full text-center rounded bg-gray-500 hover:bg-gray-600 text-white py-3 text-lg font-semibold'
        >
          Архив записей (Archive)
        </Link>

        <a
          href='/api/status'
          className='block w-full text-center rounded bg-yellow-500 hover:bg-yellow-600 text-white py-3 text-lg font-semibold'
        >
          Статус трансляции (API)
        </a>
      </div>
    </div>
  )
}
