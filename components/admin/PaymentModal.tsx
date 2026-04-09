'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle, X } from 'lucide-react'

interface LatestEvent {
  id: number
  title: string
  type: 'CONFERENCE' | 'CLASS'
  startDate: string
}

interface Props {
  isOpen: boolean
  userId: number
  userName: string
  onClose: () => void
  onSave: (result: { paymentDate: string; accessUntil: string }) => void
}

const EVENT_TYPE_LABELS: Record<'CONFERENCE' | 'CLASS', string> = {
  CONFERENCE: 'Конференция',
  CLASS: 'Класс',
}

export default function PaymentModal({ isOpen, userId, userName, onClose, onSave }: Props) {
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState<'CONFERENCE' | 'CLASS'>('CONFERENCE')
  const [eventStartDate, setEventStartDate] = useState('')
  const [confirmedPast, setConfirmedPast] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const eventIsPast = eventStartDate ? new Date(eventStartDate) < new Date(today) : false

  useEffect(() => {
    if (!isOpen) return
    setConfirmedPast(false)
    setSaving(false)
    setLoadingEvent(true)

    fetch('/api/events/latest')
      .then((r) => r.json())
      .then((event: LatestEvent | null) => {
        if (event) {
          setEventTitle(event.title)
          setEventType(event.type)
          setEventStartDate(new Date(event.startDate).toISOString().slice(0, 10))
        } else {
          setEventTitle('')
          setEventType('CONFERENCE')
          setEventStartDate('')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEvent(false))
  }, [isOpen])

  const handleSave = async () => {
    if (!eventTitle.trim() || !eventStartDate) return
    if (eventIsPast && !confirmedPast) return

    setSaving(true)
    try {
      const res = await fetch(`/api/users/${userId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: eventTitle.trim(),
          eventType,
          eventStartDate,
        }),
      })
      if (!res.ok) {
        alert('Ошибка при сохранении')
        return
      }
      const data = await res.json()
      onSave(data)
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

        {loadingEvent ? (
          <div className="text-center py-6 text-white/40 text-sm">Загрузка...</div>
        ) : (
          <div className="space-y-4">
            {/* Тип мероприятия */}
            <div>
              <label className="block text-xs text-purple-300 mb-1.5">Тип мероприятия</label>
              <div className="flex gap-2">
                {(['CONFERENCE', 'CLASS'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEventType(t)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                      eventType === t
                        ? 'bg-pink-600 border-pink-500 text-white'
                        : 'bg-purple-800/50 border-purple-600/30 text-white/60 hover:text-white'
                    }`}
                  >
                    {EVENT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Название мероприятия */}
            <div>
              <label className="block text-xs text-purple-300 mb-1.5">Название мероприятия</label>
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Пасхальная конференция 2026"
                className="w-full bg-purple-800/50 border border-purple-600/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Дата начала мероприятия */}
            <div>
              <label className="flex text-xs text-purple-300 mb-1.5 items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Дата начала мероприятия
              </label>
              <input
                type="date"
                value={eventStartDate}
                onChange={(e) => { setEventStartDate(e.target.value); setConfirmedPast(false) }}
                className="w-full bg-purple-800/50 border border-purple-600/30 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Дата окончания доступа (информация) */}
            {eventStartDate && (
              <div className="bg-purple-800/30 border border-purple-600/20 rounded-xl px-4 py-3 text-sm">
                <span className="text-white/50">Доступ будет открыт до: </span>
                <span className="text-green-400 font-medium">
                  {new Date(
                    Math.max(new Date(eventStartDate).getTime(), Date.now()) + 30 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString('ru-RU')}
                </span>
              </div>
            )}

            {/* Предупреждение если дата прошла */}
            {eventIsPast && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-yellow-300 text-sm">
                    Дата мероприятия уже прошла. Доступ будет открыт на 30 дней с сегодняшнего дня.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedPast}
                    onChange={(e) => setConfirmedPast(e.target.checked)}
                    className="w-4 h-4 rounded accent-yellow-400"
                  />
                  <span className="text-yellow-200/80 text-xs">Понимаю, всё равно подтверждаю</span>
                </label>
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
            disabled={saving || !eventTitle.trim() || !eventStartDate || (eventIsPast && !confirmedPast)}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
          >
            {saving ? 'Сохранение...' : 'Подтвердить оплату'}
          </button>
        </div>
      </div>
    </div>
  )
}
