import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

const BCRYPT_ROUNDS = 12

export function generateNumericPassword() {
  return crypto.randomInt(100000, 1_000_000).toString()
}

export function isHashedPassword(value: string): boolean {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$')
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isHashedPassword(stored)) {
    return bcrypt.compare(plain, stored)
  }
  return stored === plain
}

export async function verifyAndUpgradePassword(
  userId: number,
  plain: string,
  stored: string
): Promise<boolean> {
  const matches = await verifyPassword(plain, stored)
  if (!matches) return false
  if (!isHashedPassword(stored)) {
    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(plain) },
    })
  }
  return true
}
