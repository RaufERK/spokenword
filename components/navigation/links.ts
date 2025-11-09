// components/navigation/links.ts

import { Role } from '@/lib/roles'

const links: { href: string; label: string; roles?: Role[] }[] = [
  { href: '/', label: 'Главная' },
  // { href: '/live', label: 'Стрим' },  // Временно скрыто
  // { href: '/audio', label: 'Аудио' },  // Временно скрыто
  // { href: '/archive', label: 'Архив стримов' },  // Временно скрыто
  {
    href: '/conf',
    label: 'Конференция',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
  {
    href: '/conf-arch',
    label: 'Архив конф.',
    roles: ['USER', 'MODERATOR', 'ADMIN', 'SUPER'],
  },
  {
    href: '/upload',
    label: 'Загрузка файлов',
    roles: ['MODERATOR', 'ADMIN', 'SUPER'],
  },
  {
    href: '/links',
    label: 'Ссылки',
    roles: ['MODERATOR', 'ADMIN', 'SUPER'],
  },
  { href: '/users', label: 'Пользователи', roles: ['ADMIN', 'SUPER'] },
  {
    href: '/admin/packages',
    label: 'Управление пакетами',
    roles: ['ADMIN', 'SUPER'],
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
