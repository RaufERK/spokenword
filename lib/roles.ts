// lib/roles.ts
export const ROLES = ['USER', 'MODERATOR', 'ADMIN', 'SUPER'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  SUPER: 3,
}

export const STAFF_ROLES = ['MODERATOR', 'ADMIN', 'SUPER'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return STAFF_ROLES.some((staffRole) => staffRole === role)
}

/** Passwords and profile tokens: own account, or strictly lower role. SUPER credentials stay with SUPER only. */
export function canViewUserCredentials(
  actor: { id: number; role: Role },
  target: { id: number; role: Role },
): boolean {
  if (actor.id === target.id) return true
  return ROLE_RANK[actor.role] > ROLE_RANK[target.role]
}
