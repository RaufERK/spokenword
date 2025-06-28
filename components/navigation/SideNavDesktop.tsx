'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Role } from '@/lib/roles'
import links from './links'

export default function SideNavDesktop() {
  const { data } = useSession()
  const role: Role | undefined = data?.user?.role

  return (
    <nav className='w-full flex items-center justify-between p-4 bg-blue-700 border-b-4 border-green-600 shadow-md'>
      <div className='flex gap-6'>
        {links
          .filter((l) => !l.roles || (role && l.roles.includes(role)))
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className='text-lg text-white hover:underline transition'
            >
              {l.label}
            </Link>
          ))}
      </div>
      {role ? (
        <Link href='/logout' className='text-green-400 hover:underline'>
          Выйти
        </Link>
      ) : (
        <>
          <Link href='/login' className='text-green-400 hover:underline mr-3'>
            Войти
          </Link>
          <Link href='/register' className='text-green-400 hover:underline'>
            Регистрация
          </Link>
        </>
      )}
    </nav>
  )
}
