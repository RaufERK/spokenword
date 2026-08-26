import { authOptions } from '@/lib/auth'
import { isAdminRole, isStaffRole, type Role } from '@/lib/roles'
import { getServerSession } from 'next-auth'
import type { User } from 'next-auth'
import { NextResponse } from 'next/server'

type AuthOk = { user: User; error: null }
type AuthFail = { user: null; error: NextResponse }

async function readUser(): Promise<User | null> {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}

function unauthorized(): AuthFail {
  return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
}

function forbidden(): AuthFail {
  return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}

export async function requireUser(): Promise<AuthOk | AuthFail> {
  const user = await readUser()
  if (!user) return unauthorized()
  return { user, error: null }
}

export async function requireStaff(): Promise<AuthOk | AuthFail> {
  const result = await requireUser()
  if (result.error) return result
  if (!isStaffRole(result.user.role)) return forbidden()
  return result
}

export async function requireAdmin(): Promise<AuthOk | AuthFail> {
  const result = await requireUser()
  if (result.error) return result
  if (!isAdminRole(result.user.role)) return forbidden()
  return result
}

export async function requireRole(...roles: Role[]): Promise<AuthOk | AuthFail> {
  const result = await requireUser()
  if (result.error) return result
  if (!roles.includes(result.user.role)) return forbidden()
  return result
}
