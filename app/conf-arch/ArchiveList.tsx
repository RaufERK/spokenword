'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlayCircle, Trash2, Calendar, Eye, Search, BookOpen, GraduationCap } from 'lucide-react'

type ArchiveItem = {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
  views: number
  isPublic: boolean
  duration: number | null
}

function formatDuration(sec: number | null) {
  if (!sec) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}ч ${m}м`
  return `${m} мин`
}

function FileItem({
  item,
  type,
  isAdmin,
  onDelete,
}: {
  item: ArchiveItem
  type: 'conf' | 'class'
  isAdmin: boolean
  onDelete: (systemName: string) => void
}) {
  const watchUrl = type === 'conf'
    ? `/watch-conf/${encodeURIComponent(item.systemName)}`
    : `/watch-class/${encodeURIComponent(item.systemName)}`

  const deleteUrl = type === 'conf'
    ? `/api/conf-archive/${encodeURIComponent(item.systemName)}`
    : `/api/class/${encodeURIComponent(item.systemName)}`

  return (
    <li className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-400/30 p-4 rounded-xl transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {type === 'class' ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Класс
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Конференция
            </span>
          )}
          {isAdmin && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                item.isPublic
                  ? 'bg-green-900/40 text-green-400 border border-green-500/30'
                  : 'bg-red-900/40 text-red-400 border border-red-500/30'
              }`}
            >
              {item.isPublic ? 'Публично' : 'Скрыто'}
            </span>
          )}
        </div>
        <p className="font-semibold text-white truncate">{item.displayName}</p>
        <div className="flex flex-wrap gap-3 mt-1 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(item.uploadedAt).toLocaleDateString('ru-RU')}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {item.views}
          </span>
          <span>{(item.size / 1024 / 1024).toFixed(1)} МБ</span>
          {item.duration && <span>{formatDuration(item.duration)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        <Link
          href={watchUrl}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-colors"
          prefetch={false}
          target="_blank"
        >
          <PlayCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Смотреть</span>
        </Link>
        {isAdmin && (
          <button
            className="p-2 bg-red-600/60 hover:bg-red-600 text-white rounded-xl transition-colors"
            onClick={async () => {
              if (!confirm(`Удалить "${item.displayName}"?`)) return
              const res = await fetch(deleteUrl, { method: 'DELETE' })
              if (res.ok) onDelete(item.systemName)
              else alert('Ошибка удаления')
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </li>
  )
}

type Tab = 'all' | 'conf' | 'class'

export default function ArchiveList({
  confFiles: initialConf,
  classFiles: initialClass,
  isAdmin,
}: {
  confFiles: ArchiveItem[]
  classFiles: ArchiveItem[]
  isAdmin: boolean
}) {
  const [confFiles, setConfFiles] = useState(initialConf)
  const [classFiles, setClassFiles] = useState(initialClass)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const all = [
    ...confFiles.map((f) => ({ ...f, type: 'conf' as const })),
    ...classFiles.map((f) => ({ ...f, type: 'class' as const })),
  ].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

  const filtered = all
    .filter((f) => tab === 'all' || f.type === tab)
    .filter((f) => !search || f.displayName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start">
          {(['all', 'conf', 'class'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {t === 'all' ? 'Все' : t === 'conf' ? 'Конференции' : 'Класс'}
              <span className="ml-1.5 text-xs opacity-60">
                {t === 'all' ? all.length : t === 'conf' ? confFiles.length : classFiles.length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-white/40 text-center py-12">
          {search ? 'Ничего не найдено' : 'Архив пуст'}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((f) => (
            <FileItem
              key={`${f.type}-${f.id}`}
              item={f}
              type={f.type}
              isAdmin={isAdmin}
              onDelete={(sn) => {
                if (f.type === 'conf') setConfFiles((p) => p.filter((x) => x.systemName !== sn))
                else setClassFiles((p) => p.filter((x) => x.systemName !== sn))
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
