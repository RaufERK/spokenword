'use client'

import { useEffect, useState } from 'react'
import { History, X, Ban } from 'lucide-react'

type PaymentRow = {
  id: number
  eventId: number
  eventTitle: string
  eventType: 'CONFERENCE' | 'CLASS'
  paymentDate: string
  accessUntil: string
  status: 'ACTIVE' | 'REVOKED'
  isActiveNow: boolean
  grantedBy: string
  revokedAt: string | null
  revokedBy: string | null
}

const TYPE_LABELS = { CONFERENCE: 'Конференция', CLASS: 'Класс' }

export default function PaymentHistoryModal({
  isOpen,
  userId,
  userName,
  canRevoke,
  onClose,
  onAccessUntilChange,
}: {
  isOpen: boolean
  userId: number
  userName: string
  canRevoke: boolean
  onClose: () => void
  onAccessUntilChange: (accessUntil: string | null) => void
}) {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/users/${userId}/payments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PaymentRow[]) => setRows(data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isOpen) return
    load()
  }, [isOpen, userId])

  const handleRevoke = async (eventId: number) => {
    if (!confirm('Отозвать доступ к этому мероприятию?')) return
    setRevokingId(eventId)
    try {
      const res = await fetch(`/api/users/${userId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', eventId }),
      })
      if (!res.ok) {
        alert('Не удалось отозвать доступ')
        return
      }
      const data = await res.json() as { accessUntil: string | null }
      onAccessUntilChange(data.accessUntil)
      load()
    } finally {
      setRevokingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-purple-900/95 border border-purple-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-300" />
            История оплат
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-purple-800/50 border border-purple-600/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-white/60 text-xs mb-0.5">Пользователь</p>
          <p className="text-white font-semibold">{userName}</p>
        </div>

        <div className="overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <p className="text-center py-8 text-white/40 text-sm">Загрузка...</p>
          ) : rows.length === 0 ? (
            <p className="text-center py-8 text-white/40 text-sm">Оплат ещё не было</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="bg-purple-800/40 border border-purple-600/25 rounded-xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate">{row.eventTitle}</p>
                    <p className="text-white/45 text-xs mt-0.5">
                      {TYPE_LABELS[row.eventType]} · выдал {row.grantedBy}
                    </p>
                  </div>
                  {row.isActiveNow ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-green-500/20 text-green-400 border border-green-500/30">
                      действует
                    </span>
                  ) : row.status === 'REVOKED' ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-red-500/15 text-red-300 border border-red-500/25">
                      отозвано
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[11px] bg-orange-500/15 text-orange-300 border border-orange-500/25">
                      истекло
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-white/50 space-y-0.5">
                  <p>Оплата: {new Date(row.paymentDate).toLocaleDateString('ru-RU')}</p>
                  <p>Доступ до: {new Date(row.accessUntil).toLocaleDateString('ru-RU')}</p>
                  {row.status === 'REVOKED' && row.revokedAt && (
                    <p>
                      Отозвано {new Date(row.revokedAt).toLocaleDateString('ru-RU')}
                      {row.revokedBy ? ` · ${row.revokedBy}` : ''}
                    </p>
                  )}
                </div>
                {canRevoke && row.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRevoke(row.eventId)}
                    disabled={revokingId === row.eventId}
                    className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-red-600/70 hover:bg-red-500 text-white disabled:opacity-40"
                  >
                    <Ban className="w-3 h-3" />
                    {revokingId === row.eventId ? 'Отзыв...' : 'Отозвать'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
