import type { Request } from 'express'

export function requireUploader(
  req: Request,
  allowedRoles: string[]
): { userId: number; role: string } | { error: string; status: number } {
  const userId = Number.parseInt(String(req.headers['x-user-id'] || ''), 10)
  const role = String(req.headers['x-user-role'] || '')

  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: 'Unauthorized', status: 401 }
  }

  if (!allowedRoles.includes(role)) {
    return { error: 'Forbidden', status: 403 }
  }

  return { userId, role }
}
