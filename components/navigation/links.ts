import { Role } from '@/lib/roles'

export type NavLink = {
  href: string
  label: string
  roles?: Role[]
  isAdmin?: boolean
  isPaid?: boolean
}

const links: NavLink[] = [
  { href: '/', label: 'Трансляция' },
  {
    href: '/conf-arch',
    label: 'Архив',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
  { href: '/news', label: 'Новости' },
  {
    href: '/chat',
    label: 'Чат',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
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
