import { Role } from '@/lib/roles'

export type NavLink = {
  href: string
  label: string
  roles?: Role[]
  isAdmin?: boolean
  isPaid?: boolean
}

const links: NavLink[] = [
  { href: '/', label: 'Стрим' },
  {
    href: '/chat',
    label: 'Чат',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
  {
    href: '/conf-arch',
    label: 'Архив',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
  // {
  //   href: '/class',
  //   label: 'Класс',
  //   roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  //   isPaid: true,
  // },
  {
    href: '/paid-content',
    label: 'Платные материалы',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
  {
    href: '/profile',
    label: 'Профиль',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
]

export default links
