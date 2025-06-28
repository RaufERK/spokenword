'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Role } from '@/lib/roles'
import { Menu, X } from 'lucide-react'
import links from './links'

export default function SideNavMobile() {
  const { data } = useSession()
  const role: Role | undefined = data?.user?.role
  const [open, setOpen] = useState(false)

  return (
    <nav className='w-full bg-blue-700 border-b-4 border-green-600 p-3 flex items-center justify-between'>
      <button
        onClick={() => setOpen(!open)}
        aria-label='Меню'
        className='text-white'
      >
        {open ? <X size={28} /> : <Menu size={28} />}
      </button>
      <span className='text-white font-bold text-xl'>Меню</span>
      <div />
      {/* Выпадающее меню */}
      {open && (
        <div className='absolute top-16 left-0 w-full bg-blue-800 z-50 flex flex-col gap-3 p-4 shadow-2xl animate-fade-in'>
          {links
            .filter((l) => !l.roles || (role && l.roles.includes(role)))
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className='block text-lg text-white py-2 px-3 rounded hover:bg-blue-900 transition'
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          <div className='flex gap-2 mt-3'>
            {role ? (
              <Link
                href='/logout'
                className='text-green-400 hover:underline'
                onClick={() => setOpen(false)}
              >
                Выйти
              </Link>
            ) : (
              <>
                <Link
                  href='/login'
                  className='text-green-400 hover:underline mr-3'
                  onClick={() => setOpen(false)}
                >
                  Войти
                </Link>
                <Link
                  href='/register'
                  className='text-green-400 hover:underline'
                  onClick={() => setOpen(false)}
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
