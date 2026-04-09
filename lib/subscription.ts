export function isSubscriptionActive(accessUntil: string | Date | null): boolean {
  if (!accessUntil) return false
  const until = typeof accessUntil === 'string' ? new Date(accessUntil) : accessUntil
  return until.getTime() > Date.now()
}

export function computeAccessUntil(paymentDate: Date, eventStartDate: Date): Date {
  const startPoint = eventStartDate > paymentDate ? eventStartDate : paymentDate
  return new Date(startPoint.getTime() + 30 * 24 * 60 * 60 * 1000)
}
