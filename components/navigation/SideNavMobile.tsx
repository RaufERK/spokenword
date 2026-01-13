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

  const regularLinks = links.filter(
    (l) => !l.isAdmin && (!l.roles || (role && l.roles.includes(role)))
  )
  const adminLinks = links.filter(
    (l) => l.isAdmin && (!l.roles || (role && l.roles.includes(role)))
  )

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
          {regularLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className='block text-lg text-white py-2 px-3 rounded hover:bg-blue-900 transition'
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {adminLinks.length > 0 && (
            <>
              <div className='border-t border-purple-400 my-2' />
              <div className='text-sm text-purple-300 font-semibold px-3'>
                АДМИН ПАНЕЛЬ
              </div>
              {adminLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className='block text-lg text-white py-2 px-3 rounded bg-purple-600 hover:bg-purple-700 transition'
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}
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
