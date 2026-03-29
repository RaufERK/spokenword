'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Role } from '@/lib/roles'
import { isSubscriptionActive } from '@/lib/subscription'
import { Menu, X, ShieldAlert, LogOut } from 'lucide-react'
import links from './links'

export default function SideNavMobile() {
  const { data } = useSession()
  const pathname = usePathname()
  const role: Role | undefined = data?.user?.role
  const paymentDate = data?.user?.paymentDate ?? null
  const isAdmin = role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER'
  const hasActiveSub = isSubscriptionActive(paymentDate)
  const [open, setOpen] = useState(false)

  const regularLinks = links.filter((l) => {
    if (l.isAdmin) return false
    if (!l.roles || (role && l.roles.includes(role))) {
      if (l.isPaid && role === 'USER' && !hasActiveSub) return false
      return true
    }
    return false
  })

  return (
    <nav className='w-full bg-gradient-to-r from-[#1565c0] to-[#0d47a1] shadow-lg'>
      <div className='flex items-center justify-between px-4 h-14'>
        <button
          onClick={() => setOpen(!open)}
          aria-label='Меню'
          className='text-white p-1'
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
        <span className='text-white font-semibold'>spoken-word.ru</span>
        {role ? (
          <Link href='/logout' className='text-[#4ade80]'>
            <LogOut size={20} />
          </Link>
        ) : (
          <Link href='/login' className='text-[#4ade80] text-sm'>
            Войти
          </Link>
        )}
      </div>

      {open && (
        <div className='absolute top-14 left-0 w-full bg-[#0d47a1] z-50 flex flex-col shadow-2xl border-t border-blue-600'>
          {regularLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-white py-3 px-5 transition-colors ${
                pathname === l.href ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className='border-t border-red-500 mx-4 my-1' />
              <Link
                href='/admin'
                className='text-white py-3 px-5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 flex items-center gap-2 transition-colors'
                onClick={() => setOpen(false)}
              >
                <ShieldAlert className='w-4 h-4' />
                АДМИН
              </Link>
            </>
          )}

          {!role && (
            <div className='flex gap-3 p-4 border-t border-blue-600'>
              <Link
                href='/register'
                className='flex-1 text-center py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition'
                onClick={() => setOpen(false)}
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
