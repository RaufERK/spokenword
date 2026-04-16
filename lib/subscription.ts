import prisma from '@/lib/prisma'

export function isSubscriptionActive(accessUntil: string | Date | null): boolean {
  if (!accessUntil) return false
  const until = typeof accessUntil === 'string' ? new Date(accessUntil) : accessUntil
  return until.getTime() > Date.now()
}

export function computeAccessUntil(paymentDate: Date, eventStartDate: Date, accessDays = 30): Date {
  const startPoint = eventStartDate > paymentDate ? eventStartDate : paymentDate
  return new Date(startPoint.getTime() + accessDays * 24 * 60 * 60 * 1000)
}

export async function recalculateAccessUntil(userId: number): Promise<Date | null> {
  const accesses = await prisma.userEventAccess.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { event: { select: { startDate: true, accessDays: true } } },
  })

  if (accesses.length === 0) {
    await prisma.user.update({ where: { id: userId }, data: { accessUntil: null } })
    return null
  }

  let maxDate: Date | null = null
  for (const access of accesses) {
    const end = computeAccessUntil(access.paymentDate, access.event.startDate, access.event.accessDays)
    if (!maxDate || end > maxDate) maxDate = end
  }

  await prisma.user.update({ where: { id: userId }, data: { accessUntil: maxDate } })
  return maxDate
}
