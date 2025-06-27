// components/SideNav.tsx
'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

type Role = 'USER' | 'ADMIN' | 'SUPER'

export default function SideNav() {
  const { data } = useSession()
  const role: Role | undefined = data?.user?.role

  const links: { href: string; label: string; roles?: Role[] }[] = [
    { href: '/', label: 'Главная' },
    { href: '/archive', label: 'Архив' },
    { href: '/conf', label: 'Конференция', roles: ['USER', 'ADMIN', 'SUPER'] },
    {
      href: '/conf-arch',
      label: 'Архив конф.',
      roles: ['USER', 'ADMIN', 'SUPER'],
    },
    { href: '/users', label: 'Пользователи', roles: ['ADMIN', 'SUPER'] },
    { href: '/admin', label: 'Управление архивом', roles: ['ADMIN', 'SUPER'] },
    { href: '/profile', label: 'Профиль', roles: ['USER', 'ADMIN', 'SUPER'] }, // ← Новая ссылка
  ]

  return (
    <nav className='flex items-center justify-between p-4 bg-blue-700 border-b-4 border-green-600'>
      <div className='flex gap-6'>
        {links
          .filter(
            (l) =>
              // Показываем пункт если либо не указаны роли (публичный), либо роль пользователя соответствует
              !l.roles || (role && l.roles.includes(role))
          )
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className='text-lg text-white hover:underline'
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
