'use client'

import { useState } from 'react'
import { Plus, Pencil, Calendar, Users, Film, CheckCircle, Clock } from 'lucide-react'

interface EventRow {
  id: number
  title: string
  type: 'CONFERENCE' | 'CLASS'
  startDate: string
  accessDays: number
  createdAt: string
  _count: { payments: number; files: number }
}

interface EventForm {
  title: string
  type: 'CONFERENCE' | 'CLASS'
  startDate: string
  accessDays: number
}

const EMPTY_FORM: EventForm = {
  title: '',
  type: 'CONFERENCE',
  startDate: '',
  accessDays: 30,
}

const TYPE_LABELS = { CONFERENCE: 'Конференция', CLASS: 'Класс' }

function getEventStatus(startDate: string): { label: string; color: string } {
  const diff = new Date(startDate).getTime() - Date.now()
  if (diff > 0) return { label: 'Предстоящее', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' }
  return { label: 'Прошедшее', color: 'text-white/40 bg-white/5 border-white/10' }
}

interface Props {
  initialEvents: EventRow[]
  canEdit: boolean
}

export default function EventsClient({ initialEvents, canEdit }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditingEvent(null)
    setForm(EMPTY_FORM)
    setIsModalOpen(true)
  }

  const openEdit = (event: EventRow) => {
    setEditingEvent(event)
    setForm({
      title: event.title,
      type: event.type,
      startDate: new Date(event.startDate).toISOString().slice(0, 10),
      accessDays: event.accessDays,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate) return
    setSaving(true)
    try {
      if (editingEvent) {
        const res = await fetch(`/api/admin/events/${editingEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) { alert('Ошибка при сохранении'); return }
        const updated = await res.json()
        setEvents((prev) => prev.map((e) => e.id === updated.id ? { ...e, ...updated, startDate: updated.startDate, _count: e._count } : e))
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) { alert('Ошибка при создании'); return }
        const created = await res.json()
        setEvents((prev) => [{ ...created, _count: { payments: 0, files: 0 } }, ...prev])
      }
      setIsModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-5">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Создать мероприятие
          </button>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-purple-900/40 border border-pink-400/20 rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-sm">Мероприятий пока нет</p>
          {canEdit && (
            <button
              onClick={openCreate}
              className="mt-4 px-4 py-2 bg-pink-600/80 hover:bg-pink-500 text-white rounded-xl text-sm transition-colors"
            >
              Создать первое
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const status = getEventStatus(event.startDate)
            return (
              <div
                key={event.id}
                className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 border border-pink-400/20 rounded-2xl p-5 flex flex-col gap-4"
              >
                {/* Шапка */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-snug">{event.title}</p>
                    <p className="text-pink-300/60 text-xs mt-0.5">{TYPE_LABELS[event.type]}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-lg text-xs border ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Детали */}
                <div className="space-y-1.5 text-xs text-white/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Начало: {new Date(event.startDate).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Доступ: {event.accessDays} дней</span>
                  </div>
                </div>

                {/* Счётчики */}
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{event._count.payments} оплатили</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400">
                    <Film className="w-3.5 h-3.5" />
                    <span>{event._count.files} видео</span>
                  </div>
                </div>

                {/* Кнопки */}
                {canEdit && (
                  <button
                    onClick={() => openEdit(event)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs transition-colors border border-white/10"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Редактировать
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Модалка создания / редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-purple-900/95 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-pink-400" />
                {editingEvent ? 'Редактировать мероприятие' : 'Новое мероприятие'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Тип */}
              <div>
                <label className="block text-xs text-purple-300 mb-1.5">Тип</label>
                <div className="flex gap-2">
                  {(['CONFERENCE', 'CLASS'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        form.type === t
                          ? 'bg-pink-600 border-pink-500 text-white'
                          : 'bg-purple-800/50 border-purple-600/30 text-white/60 hover:text-white'
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Название */}
              <div>
                <label className="block text-xs text-purple-300 mb-1.5">Название</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="КОНФЕРЕНЦИЯ ВЕСНА 2026"
                  className="w-full bg-purple-800/50 border border-purple-600/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Дата начала */}
              <div>
                <label className="block text-xs text-purple-300 mb-1.5">Дата начала</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-purple-800/50 border border-purple-600/30 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Дней доступа */}
              <div>
                <label className="block text-xs text-purple-300 mb-1.5">
                  Дней доступа к архиву
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.accessDays}
                  onChange={(e) => setForm((f) => ({ ...f, accessDays: Number(e.target.value) }))}
                  className="w-full bg-purple-800/50 border border-purple-600/30 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-white/30 text-xs mt-1">
                  Доступ к видео этого мероприятия — {form.accessDays} дней с даты начала
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-purple-300 border border-purple-600/50 rounded-xl hover:bg-purple-800 disabled:opacity-50 transition text-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.startDate}
                className="flex-1 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                {saving ? 'Сохранение...' : editingEvent ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
