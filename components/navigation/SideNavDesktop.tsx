'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Role } from '@/lib/roles'
import links from './links'

export default function SideNavDesktop() {
  const { data } = useSession()
  const role: Role | undefined = data?.user?.role

  const regularLinks = links.filter(
    (l) => !l.isAdmin && (!l.roles || (role && l.roles.includes(role)))
  )
  const adminLinks = links.filter(
    (l) => l.isAdmin && (!l.roles || (role && l.roles.includes(role)))
  )

  return (
    <nav className='w-full flex items-center justify-between p-4 bg-blue-700 border-b-4 border-green-600 shadow-md'>
      <div className='flex items-center gap-6'>
        {regularLinks.map((l, index) => (
          <div key={l.href} className='flex items-center gap-6'>
            <Link
              href={l.href}
              className='text-lg text-white hover:underline transition'
            >
              {l.label}
            </Link>
            {index < regularLinks.length - 1 && (
              <div className='h-6 w-px bg-blue-300' />
            )}
          </div>
        ))}
      </div>
      <div className='flex items-center gap-6'>
        {adminLinks.length > 0 && (
          <div className='flex items-center gap-4 px-4 py-2 bg-purple-600 rounded-lg'>
            {adminLinks.map((l, index) => (
              <div key={l.href} className='flex items-center gap-4'>
                <Link
                  href={l.href}
                  className='text-lg text-white hover:underline transition'
                >
                  {l.label}
                </Link>
                {index < adminLinks.length - 1 && (
                  <div className='h-6 w-px bg-purple-300' />
                )}
              </div>
            ))}
          </div>
        )}
        {role ? (
          <Link href='/logout' className='text-green-400 hover:underline'>
            Выйти
          </Link>
        ) : (
          <div className='flex gap-3'>
            <Link href='/login' className='text-green-400 hover:underline'>
              Войти
            </Link>
            <Link href='/register' className='text-green-400 hover:underline'>
              Регистрация
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
