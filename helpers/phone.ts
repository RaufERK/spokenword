// helpers/phone.ts
export const normalizePhone = (raw: string) =>
  raw
    .replace(/\D+/g, '')
    .replace(/^8/, '7')

/** +7 999 123-45-67 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D+/g, '').replace(/^8/, '7')
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }
  // международный: +X XXX XXX-XX-XX или просто +digits
  if (digits.length >= 10) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }
  return raw.startsWith('+') ? raw : `+${raw}`
}
