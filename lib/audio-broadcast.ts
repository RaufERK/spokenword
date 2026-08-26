const MOSCOW_OFFSET = '+03:00'

export function parseSlotStartsAt(value: string): Date | null {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}:00${MOSCOW_OFFSET}`)
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}${MOSCOW_OFFSET}`)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function slotWindow(startsAt: Date, durationSec: number | null) {
  const durationMs = Math.max(durationSec ?? 0, 60) * 1000
  return { start: startsAt.getTime(), end: startsAt.getTime() + durationMs }
}

export function windowsOverlap(
  first: { start: number; end: number },
  second: { start: number; end: number }
) {
  return first.start < second.end && second.start < first.end
}
