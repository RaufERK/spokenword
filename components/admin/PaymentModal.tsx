'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X, Calendar } from 'lucide-react'
import { computeAccessUntil } from '@/lib/subscription'

interface EventItem {
  id: number
  title: string
  type: 'CONFERENCE' | 'CLASS'
  startDate: string
  accessDays: number
}

interface Props {
  isOpen: boolean
  userId: number
  userName: string
  onClose: () => void
  onSave: (result: { userId: number; accessUntil: string | null; eventTitle: string }) => void
}

export default function PaymentModal({ isOpen, userId, userName, onClose, onSave }: Props) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setSaving(false)
    setLoading(true)

    fetch('/api/events')
      .then((r) => r.json())
      .then((data: EventItem[]) => {
        setEvents(data)
        if (data.length > 0) setSelectedEventId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen])

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null

  const previewAccessUntil = selectedEvent
    ? computeAccessUntil(new Date(), new Date(selectedEvent.startDate), selectedEvent.accessDays)
    : null

  const handleSave = async () => {
    if (!selectedEventId || !selectedEvent) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant', eventId: selectedEventId }),
      })
      if (!res.ok) {
        alert('Ошибка при сохранении')
        return
      }
      const data = await res.json()
      onSave({
        userId,
        accessUntil: data.accessUntil ?? null,
        eventTitle: selectedEvent.title,
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-purple-900/95 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Поступила оплата
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-purple-800/50 border border-purple-600/30 rounded-xl px-4 py-3 mb-5">
          <p className="text-white/60 text-xs mb-0.5">Пользователь</p>
          <p className="text-white font-semibold">{userName}</p>
        </div>

        {loading ? (
          <div className="text-center py-6 text-white/40 text-sm">Загрузка...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-yellow-300/70 text-sm">
            Нет мероприятий. Сначала создайте мероприятие в разделе «Мероприятия».
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-purple-300 mb-1.5">Мероприятие</label>
              <select
                value={selectedEventId ?? ''}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="w-full bg-purple-800/50 border border-purple-600/30 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.startDate).toLocaleDateString('ru-RU')})
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="bg-purple-800/30 border border-purple-600/20 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                <div className="flex items-center gap-1.5 text-white/50">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Начало: {new Date(selectedEvent.startDate).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="text-white/50">
                  Дней доступа: {selectedEvent.accessDays}
                </div>
                {previewAccessUntil && (
                  <div>
                    <span className="text-white/50">Доступ до: </span>
                    <span className="text-green-400 font-medium">
                      {previewAccessUntil.toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-purple-300 border border-purple-600/50 rounded-xl hover:bg-purple-800 disabled:opacity-50 transition text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedEventId || events.length === 0}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            {saving ? 'Сохранение...' : 'Подтвердить оплату'}
          </button>
        </div>
      </div>
    </div>
  )
}
