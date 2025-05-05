// components/SideNav.tsx
'use client'
import Link from 'next/link'
import clsx from 'clsx'

interface Props {
  variant: 'public' | 'admin'
}

export default function SideNav({ variant }: Props) {
  const links =
    variant === 'admin'
      ? [
          { href: '/admin', label: 'Управление трансляцией' },
          { href: '/admin/archive', label: 'Управление архивом' },
        ]
      : [
          { href: '/', label: 'Главная' },
          { href: '/archive', label: 'Архив' },
        ]

  return (
    <nav
      className={clsx(
        'flex items-center justify-between p-4 border-b-4 border-red-600',
        variant === 'admin' ? 'bg-indigo-700' : 'bg-blue-700'
      )}
    >
      <div className='flex gap-6'>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className='text-lg font-medium hover:underline'
          >
            {l.label}
          </Link>
        ))}
      </div>
      {variant === 'admin' && (
        <Link
          href='/logout'
          className='text-red-600 font-medium hover:underline'
        >
          Выйти
        </Link>
      )}
    </nav>
  )
}
