// lib/subscription.ts
export function isSubscriptionActive(
  paymentDate: string | Date | null
): boolean {
  if (!paymentDate) return false
  const paid =
    typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate
  const now = new Date()
  const diff = (now.getTime() - paid.getTime()) / (1000 * 60 * 60 * 24)
  return diff < 37
}
