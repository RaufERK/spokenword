'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Trash2, Film, ShoppingBag, User, Calendar, Plus, ToggleLeft, ToggleRight } from 'lucide-react'

interface PackageItem {
  id: number
  title: string
  duration: number | null
  orderIndex: number
}

interface PackageData {
  id: number
  title: string
  description: string | null
  price: number
  items: PackageItem[]
  uploader: { firstName: string; lastName: string }
  _count: { purchases: number }
  createdAt: string
  isActive: boolean
}

interface Props {
  packages: PackageData[]
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function PackagesClient({ packages: initialPackages }: Props) {
  const [packages, setPackages] = useState(initialPackages)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const handleDelete = async (packageId: number, title: string) => {
    if (!confirm(`Удалить пакет "${title}"?\n\nДействие нельзя отменить.`)) return
    setDeletingId(packageId)
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== packageId))
      } else {
        const err = await res.json()
        alert(`Ошибка: ${err.message}`)
      }
    } catch {
      alert('Ошибка при удалении')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (pkg: PackageData) => {
    setTogglingId(pkg.id)
    try {
      const res = await fetch(`/api/admin/packages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, isActive: !pkg.isActive }),
      })
      if (res.ok) {
        setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, isActive: !p.isActive } : p))
      }
    } finally {
      setTogglingId(null)
    }
  }

  if (packages.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 border border-pink-400/20 rounded-2xl p-12 text-center">
        <Package className="w-14 h-14 text-white/15 mx-auto mb-4" />
        <p className="text-white/40 text-sm mb-4">Пакетов пока нет</p>
        <Link
          href="/admin/packages/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать первый пакет
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className={`bg-gradient-to-br from-purple-900/60 to-pink-900/40 border rounded-2xl p-5 transition-all ${
            pkg.isActive ? 'border-pink-400/25' : 'border-white/10 opacity-60'
          }`}
        >
          {/* Шапка */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-white font-semibold text-base">{pkg.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                  pkg.isActive
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-white/5 text-white/30 border-white/10'
                }`}>
                  {pkg.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              {pkg.description && (
                <p className="text-purple-200/60 text-sm">{pkg.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-green-400">{pkg.price} ₽</p>
            </div>
          </div>

          {/* Метаданные */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/45 mb-4">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              {pkg.items.length} лекций
            </span>
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" />
              {pkg._count.purchases} покупок
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(pkg.createdAt).toLocaleDateString('ru-RU')}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {pkg.uploader.firstName} {pkg.uploader.lastName}
            </span>
          </div>

          {/* Содержание */}
          {pkg.items.length > 0 && (
            <div className="bg-purple-950/40 border border-purple-600/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-purple-300/60 mb-2 font-medium uppercase tracking-wide">Содержание</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {pkg.items.slice(0, 6).map((item, i) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-white/50 shrink-0">{i + 1}.</span>
                    <span className="text-white/70 flex-1 truncate">{item.title}</span>
                    {item.duration && (
                      <span className="text-purple-300/50 shrink-0 font-mono">{fmtDuration(item.duration)}</span>
                    )}
                  </div>
                ))}
                {pkg.items.length > 6 && (
                  <p className="text-white/30 text-xs col-span-2 pt-1">
                    ... ещё {pkg.items.length - 6} лекций
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/packages/${pkg.id}/items`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white rounded-xl text-xs transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
              Управление лекциями
            </Link>

            <button
              onClick={() => handleToggleActive(pkg)}
              disabled={togglingId === pkg.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors disabled:opacity-50 ${
                pkg.isActive
                  ? 'bg-yellow-600/80 hover:bg-yellow-500 text-white'
                  : 'bg-green-600/80 hover:bg-green-500 text-white'
              }`}
            >
              {pkg.isActive
                ? <><ToggleRight className="w-3.5 h-3.5" /> Деактивировать</>
                : <><ToggleLeft className="w-3.5 h-3.5" /> Активировать</>
              }
            </button>

            <button
              onClick={() => handleDelete(pkg.id, pkg.title)}
              disabled={deletingId === pkg.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700/70 hover:bg-red-600 text-white rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deletingId === pkg.id ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
