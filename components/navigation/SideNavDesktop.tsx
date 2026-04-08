'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Role } from '@/lib/roles'
import { isSubscriptionActive } from '@/lib/subscription'
import { ShieldAlert, LogOut } from 'lucide-react'
import links from './links'
import { useEffect, useState } from 'react'

export default function SideNavDesktop() {
  const { data } = useSession()
  const pathname = usePathname()
  const role: Role | undefined = data?.user?.role
  const paymentDate = data?.user?.paymentDate ?? null
  const isAdmin = role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER'
  const hasActiveSub = isSubscriptionActive(paymentDate)
  const [hasClassLinks, setHasClassLinks] = useState(false)

  useEffect(() => {
    fetch('/api/class/stream-links')
      .then((r) => r.json())
      .then((result) => {
        const d = result?.data
        setHasClassLinks(!!(d?.youtubeUrl || d?.rutubeUrl))
      })
      .catch(() => {})
  }, [])

  const regularLinks = links.filter((l) => {
    if (l.isAdmin) return false
    if (!l.roles || (role && l.roles.includes(role))) {
      if (l.isPaid) {
        // Admins/mods always see it; users — only if paid AND there are links
        if (!isAdmin && (role === 'USER' && (!hasActiveSub || !hasClassLinks))) return false
        if (!isAdmin && !role) return false
      }
      return true
    }
    return false
  })

  return (
    <nav className='w-full bg-gradient-to-r from-[#1565c0] to-[#0d47a1] shadow-lg'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* User links */}
          <div className='flex items-center space-x-1'>
            {regularLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-white px-3 py-2 rounded-md transition-colors text-sm ${
                  pathname === l.href ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className='flex items-center space-x-3'>
            {isAdmin && (
              <Link
                href='/admin'
                className='bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md hover:shadow-lg text-sm'
              >
                <ShieldAlert className='w-4 h-4' />
                <span>АДМИН</span>
              </Link>
            )}
            {role ? (
              <Link
                href='/logout'
                className='text-[#4ade80] hover:text-[#22c55e] px-3 py-2 rounded-md flex items-center space-x-1 transition-colors text-sm'
              >
                <span>Выйти</span>
                <LogOut className='w-4 h-4' />
              </Link>
            ) : (
              <div className='flex items-center space-x-3'>
                <Link href='/login' className='text-[#4ade80] hover:text-[#22c55e] text-sm transition-colors'>
                  Войти
                </Link>
                <Link href='/register' className='text-[#4ade80] hover:text-[#22c55e] text-sm transition-colors'>
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
