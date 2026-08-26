import prisma from '@/lib/prisma'
import { isStaffRole } from '@/lib/roles'
import type { Prisma } from '@prisma/client'

export function isSubscriptionActive(accessUntil: string | Date | null): boolean {
  if (!accessUntil) return false
  const until = typeof accessUntil === 'string' ? new Date(accessUntil) : accessUntil
  return until.getTime() > Date.now()
}

export function canAccessPaidArchive(
  role: string | null | undefined,
  accessUntil: string | Date | null | undefined
): boolean {
  if (isStaffRole(role)) return true
  return isSubscriptionActive(accessUntil ?? null)
}

export function computeAccessUntil(paymentDate: Date, eventStartDate: Date, accessDays = 30): Date {
  const startPoint = eventStartDate > paymentDate ? eventStartDate : paymentDate
  return new Date(startPoint.getTime() + accessDays * 24 * 60 * 60 * 1000)
}

export function isEventPaymentActive(
  paymentDate: Date,
  eventStartDate: Date,
  accessDays: number,
): boolean {
  return computeAccessUntil(paymentDate, eventStartDate, accessDays).getTime() > Date.now()
}

export async function getActiveEventIds(userId: number): Promise<number[]> {
  const accesses = await prisma.userEventAccess.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { event: { select: { id: true, startDate: true, accessDays: true } } },
  })

  return accesses
    .filter((access) =>
      isEventPaymentActive(access.paymentDate, access.event.startDate, access.event.accessDays),
    )
    .map((access) => access.event.id)
}

export async function conferenceFilesVisibleTo(
  role: string | null | undefined,
  userId: number,
): Promise<Prisma.ConferenceFileWhereInput> {
  if (isStaffRole(role)) return {}
  const eventIds = await getActiveEventIds(userId)
  return { isPublic: true, eventId: { in: eventIds } }
}

export async function canAccessConferenceFile({
  role,
  userId,
  eventId,
  isPublic,
}: {
  role: string | null | undefined
  userId: number
  eventId: number | null
  isPublic: boolean
}): Promise<boolean> {
  if (isStaffRole(role)) return true
  if (!isPublic || eventId == null) return false
  const eventIds = await getActiveEventIds(userId)
  return eventIds.includes(eventId)
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
