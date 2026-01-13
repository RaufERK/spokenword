// components/navigation/links.ts

import { Role } from '@/lib/roles'

export type NavLink = {
  href: string
  label: string
  roles?: Role[]
  isAdmin?: boolean
}

const links: NavLink[] = [
  { href: '/', label: 'Главная' },
  // { href: '/live', label: 'Стрим' },  // Временно скрыто
  // { href: '/audio', label: 'Аудио' },  // Временно скрыто
  // { href: '/archive', label: 'Архив стримов' },  // Временно скрыто
  // {
  //   href: '/conf',
  //   label: 'Конференция',
  //   roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  // },  // Временно скрыто
  {
    href: '/conf-arch',
    label: 'Архив конф.',
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
  {
    href: '/links',
    label: 'Ссылки',
    roles: ['MODERATOR', 'ADMIN', 'SUPER'],
    isAdmin: true,
  },
  {
    href: '/upload',
    label: 'Загрузка файлов',
    roles: ['MODERATOR', 'ADMIN', 'SUPER'],
    isAdmin: true,
  },
  {
    href: '/users',
    label: 'Пользователи',
    roles: ['ADMIN', 'SUPER'],
    isAdmin: true,
  },
  {
    href: '/admin/packages',
    label: 'Управление пакетами',
    roles: ['ADMIN', 'SUPER'],
    isAdmin: true,
  },
]

export default links
