// ---------- components/SideNav.tsx ----------
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
        'flex flex-col gap-2 p-4 w-60',
        variant === 'admin' ? 'bg-indigo-100' : 'bg-blue-100'
      )}
    >
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className='rounded px-3 py-2 hover:bg-white/50'
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
