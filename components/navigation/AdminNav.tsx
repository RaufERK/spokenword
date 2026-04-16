'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, LogOut, Menu, X } from 'lucide-react'
import { Role } from '@/lib/roles'

type AdminLink = {
  href: string
  label: string
  roles: Role[]
}

const adminLinks: AdminLink[] = [
  { href: '/admin', label: 'Стрим', roles: ['MODERATOR', 'ADMIN', 'SUPER'] },
  { href: '/admin/class', label: 'Конференция', roles: ['MODERATOR', 'ADMIN', 'SUPER'] },
  { href: '/admin/upload', label: 'Загрузка', roles: ['MODERATOR', 'ADMIN', 'SUPER'] },
  { href: '/admin/packages', label: 'Платные', roles: ['ADMIN', 'SUPER'] },
  { href: '/admin/users', label: 'Пользователи', roles: ['MODERATOR', 'ADMIN', 'SUPER'] },
  { href: '/admin/events', label: 'Мероприятия', roles: ['MODERATOR', 'ADMIN', 'SUPER'] },
]

export default function AdminNav() {
  const { data } = useSession()
  const pathname = usePathname()
  const role = data?.user?.role as Role | undefined
  const [open, setOpen] = useState(false)

  const visibleLinks = adminLinks.filter((l) => role && l.roles.includes(role))

  return (
    <nav className='w-full bg-gradient-to-r from-[#c2185b] to-[#880e4f] shadow-lg border-b-2 border-pink-400/30'>
      {/* Desktop */}
      <div className='hidden md:block'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-1'>
              {visibleLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                    pathname === l.href || (l.href !== '/admin' && pathname.startsWith(l.href))
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div className='flex items-center space-x-3'>
              <Link
                href='/'
                className='bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md hover:shadow-lg text-sm'
              >
                <Eye className='w-4 h-4' />
                <span>Вид пользователя</span>
              </Link>
              <Link
                href='/logout'
                className='text-pink-200 hover:text-white px-3 py-2 rounded-md flex items-center space-x-1 transition-colors text-sm'
              >
                <span>Выйти</span>
                <LogOut className='w-4 h-4' />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className='md:hidden'>
        <div className='flex items-center justify-between px-4 h-14'>
          <button onClick={() => setOpen(!open)} aria-label='Меню' className='text-white p-1'>
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
          <span className='text-white font-semibold text-sm'>Админ-панель</span>
          <Link href='/logout' className='text-pink-200'>
            <LogOut size={20} />
          </Link>
        </div>

        {open && (
          <div className='absolute top-14 left-0 w-full bg-[#880e4f] z-50 flex flex-col shadow-2xl border-t border-pink-500'>
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-white py-3 px-5 transition-colors ${
                  pathname === l.href || (l.href !== '/admin' && pathname.startsWith(l.href))
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className='border-t border-pink-500 mx-4 my-1' />
            <Link
              href='/'
              className='text-white py-3 px-5 bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-colors'
              onClick={() => setOpen(false)}
            >
              <Eye className='w-4 h-4' />
              Вид пользователя
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
