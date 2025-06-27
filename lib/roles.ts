// lib/roles.ts
export const ROLES = ['USER', 'MODERATOR', 'ADMIN', 'SUPER'] as const
export type Role = (typeof ROLES)[number]
