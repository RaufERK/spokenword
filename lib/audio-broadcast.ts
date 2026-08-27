import { decodeUploadName } from '@/lib/audio-library'

const MOSCOW_OFFSET = '+03:00'
export const MAX_ANNOUNCEMENT_LENGTH = 300

export type PublicBroadcastStatus = 'PLAYING' | 'SCHEDULED'

export type BroadcastAnnouncement = {
  announcement: string
  status: PublicBroadcastStatus
  startsAt: string
  endsAt: string
  lectureId: number
}

type SlotForAnnouncement = {
  id: number
  lectureId: number
  startsAt: Date
  status: string
  announcement: string
  lecture: { durationSec: number | null }
}

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

export function filenameWithoutExtension(name: string) {
  return decodeUploadName(name).replace(/\.[^.]+$/i, '').trim()
}

export function defaultSlotAnnouncement(title: string, originalName: string) {
  const fromTitle = decodeUploadName(title).trim()
  if (fromTitle) return fromTitle.slice(0, MAX_ANNOUNCEMENT_LENGTH)
  return filenameWithoutExtension(originalName).slice(0, MAX_ANNOUNCEMENT_LENGTH)
}

export function normalizeSlotAnnouncement(
  value: unknown,
  fallback: string
) {
  const text = typeof value === 'string' ? value.trim() : ''
  const announcement = (text || fallback).slice(0, MAX_ANNOUNCEMENT_LENGTH).trim()
  return announcement || 'Эфир'
}

function toPublicAnnouncement(slot: SlotForAnnouncement): BroadcastAnnouncement {
  const { end } = slotWindow(slot.startsAt, slot.lecture.durationSec)
  const status: PublicBroadcastStatus = slot.status === 'PLAYING' ? 'PLAYING' : 'SCHEDULED'
  return {
    announcement: slot.announcement,
    status,
    startsAt: slot.startsAt.toISOString(),
    endsAt: new Date(end).toISOString(),
    lectureId: slot.lectureId,
  }
}

export function resolvePublicBroadcast(
  now: Date,
  slots: SlotForAnnouncement[]
): { current: BroadcastAnnouncement | null; next: BroadcastAnnouncement | null } {
  const nowMs = now.getTime()
  const playing = slots.find((slot) => slot.status === 'PLAYING')
  const scheduledInWindow = slots.find((slot) => {
    if (slot.status !== 'SCHEDULED') return false
    const window = slotWindow(slot.startsAt, slot.lecture.durationSec)
    return nowMs >= window.start && nowMs < window.end
  })
  const currentSlot = playing ?? scheduledInWindow ?? null

  const nextSlot =
    slots
      .filter(
        (slot) =>
          slot.status === 'SCHEDULED' &&
          slot.startsAt.getTime() > nowMs &&
          slot.id !== currentSlot?.id
      )
      .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0] ?? null

  return {
    current: currentSlot ? toPublicAnnouncement(currentSlot) : null,
    next: nextSlot ? toPublicAnnouncement(nextSlot) : null,
  }
}
