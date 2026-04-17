'use client'

import { useState } from 'react'
import { BookOpen, Clock, Users, Lock, ChevronDown, ChevronUp, Play, CheckCircle } from 'lucide-react'
import VideoPlayer from '@/components/user/VideoPlayer'

interface PackageItem {
  id: number
  title: string
  duration: number | null
  orderIndex: number
}

interface Package {
  id: number
  title: string
  description: string | null
  price: number
  items: PackageItem[]
  _count?: { purchases: number }
}

interface PurchasedPackage extends Package {
  purchaseDate: string
  purchasePrice: number
  notes: string | null
}

interface Props {
  purchasedPackages: PurchasedPackage[]
  availablePackages: Package[]
  userRole: string
}

function fmtDuration(s: number | null) {
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function totalDuration(items: PackageItem[]) {
  const total = items.reduce((sum, i) => sum + (i.duration || 0), 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}ч ${m}мин`
  return `${m}мин`
}

function PurchasedCard({ pkg }: { pkg: PurchasedPackage }) {
  const [open, setOpen] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-xl border border-white/10 hover:border-green-400/50 transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl text-white flex-1 leading-snug">{pkg.title}</h3>
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 ml-2 mt-0.5" />
        </div>

        {pkg.description && (
          <p className="text-purple-300 text-sm mb-4">{pkg.description}</p>
        )}

        <div className="space-y-2 text-purple-200 text-sm mb-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{pkg.items.length} лекций</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{totalDuration(pkg.items)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span>Куплено {new Date(pkg.purchaseDate).toLocaleDateString('ru-RU')}</span>
        </div>

        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {open ? 'Свернуть' : 'Смотреть лекции'}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black/20">
          {pkg.items.map((item, idx) => (
            <div key={item.id} className="border-b border-white/5 last:border-0">
              <button
                onClick={() => setPlayingId(playingId === item.id ? null : item.id)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-purple-700/60 flex items-center justify-center text-xs text-purple-200 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.title}</p>
                  {item.duration && (
                    <p className="text-purple-400 text-xs">{fmtDuration(item.duration)}</p>
                  )}
                </div>
                <Play className="w-4 h-4 text-blue-400 flex-shrink-0" />
              </button>
              {playingId === item.id && (
                <div className="px-4 pb-4">
                  <VideoPlayer packageId={pkg.id} itemId={item.id} title={item.title} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LockedCard({ pkg }: { pkg: Package }) {
  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-xl border border-white/10 hover:border-blue-400/50 transition-all duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl text-white flex-1 leading-snug">{pkg.title}</h3>
          <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 ml-2 mt-0.5" />
        </div>

        {pkg.description && (
          <p className="text-purple-300 text-sm mb-4">{pkg.description}</p>
        )}

        <div className="space-y-2 text-purple-200 text-sm mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{pkg.items.length} лекций</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{totalDuration(pkg.items)}</span>
          </div>
          {pkg._count && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{pkg._count.purchases} покупок</span>
            </div>
          )}
        </div>

        <div className="bg-yellow-900/30 border border-yellow-600/30 rounded-lg p-4">
          <p className="text-yellow-200 text-sm text-center">⚠️ Нет доступа к этим материалам</p>
          <p className="text-yellow-300 text-xs text-center mt-1">
            Свяжитесь с администратором для получения доступа
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaidContentClient({ purchasedPackages, availablePackages, userRole }: Props) {
  const isModerator = ['MODERATOR', 'ADMIN', 'SUPER'].includes(userRole)

  const allPurchased = isModerator
    ? [...purchasedPackages, ...availablePackages.map(p => ({
        ...p,
        purchaseDate: new Date().toISOString(),
        purchasePrice: p.price,
        notes: null,
      }))]
    : purchasedPackages

  const hasNothing = allPurchased.length === 0 && availablePackages.length === 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Заголовок */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl text-white font-light">Платные материалы</h1>
        </div>
        <p className="text-purple-200">Специальные курсы и семинары для углубленного изучения</p>
      </div>

      {/* Купленные */}
      {allPurchased.length > 0 && (
        <section className="mb-10">
          {!isModerator && (
            <h2 className="text-lg text-green-400 font-medium mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Ваши материалы
            </h2>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {allPurchased.map(pkg => (
              <PurchasedCard key={pkg.id} pkg={pkg as PurchasedPackage} />
            ))}
          </div>
        </section>
      )}

      {/* Недоступные (только для обычных пользователей) */}
      {!isModerator && availablePackages.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg text-purple-300 font-medium mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Другие курсы
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {availablePackages.map(pkg => (
              <LockedCard key={pkg.id} pkg={pkg} />
            ))}
          </div>
        </section>
      )}

      {/* Пусто */}
      {hasNothing && (
        <div className="text-center py-20 text-purple-300">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-40" />
          <p className="text-xl">Платных материалов пока нет</p>
          <p className="text-sm mt-2 opacity-60">Скоро здесь появятся курсы</p>
        </div>
      )}

      {/* Инструкция */}
      {!isModerator && (
        <div className="mt-4 bg-gradient-to-br from-blue-900/40 to-blue-800/30 backdrop-blur-sm rounded-xl p-8 border border-blue-400/30">
          <h2 className="text-2xl text-white mb-4 font-light">Как получить доступ к материалам?</h2>
          <div className="space-y-2 text-purple-200 text-sm">
            <p>1. Выберите интересующий вас курс или семинар</p>
            <p>2. Свяжитесь с администратором для уточнения деталей</p>
            <p>3. После оплаты вам будет предоставлен доступ</p>
          </div>
        </div>
      )}
    </div>
  )
}
