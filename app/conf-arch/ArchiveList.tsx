'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { PlayCircle, Trash2, Calendar, Eye, BookOpen, GraduationCap, GripVertical } from 'lucide-react'

type ArchiveItem = {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
  views: number
  isPublic: boolean
  duration: number | null
  orderIndex: number
}

type CombinedItem = ArchiveItem & { type: 'conf' | 'class' }

function formatDuration(sec: number | null) {
  if (!sec) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}ч ${m}м`
  return `${m} мин`
}

function FileItem({
  item,
  isAdmin,
  onDelete,
  onWatch,
  dragHandleProps,
}: {
  item: CombinedItem
  isAdmin: boolean
  onDelete: (systemName: string, type: 'conf' | 'class') => void
  onWatch: (item: CombinedItem) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> | null
}) {
  const watchUrl = item.type === 'conf'
    ? `/watch-conf/${encodeURIComponent(item.systemName)}`
    : `/watch-class/${encodeURIComponent(item.systemName)}`

  const deleteUrl = item.type === 'conf'
    ? `/api/conf-archive/${encodeURIComponent(item.systemName)}`
    : `/api/class/${encodeURIComponent(item.systemName)}`

  return (
    <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-400/30 p-4 rounded-xl transition-all">
      {isAdmin && (
        <div
          {...dragHandleProps}
          className="mr-3 text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.type === 'class' ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Класс
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Конференция
            </span>
          )}
          {isAdmin && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              item.isPublic
                ? 'bg-green-900/40 text-green-400 border border-green-500/30'
                : 'bg-red-900/40 text-red-400 border border-red-500/30'
            }`}>
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
          onClick={() => onWatch(item)}
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
              if (res.ok) onDelete(item.systemName, item.type)
              else alert('Ошибка удаления')
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function ArchiveList({
  confFiles: initialConf,
  classFiles: initialClass,
  isAdmin,
}: {
  confFiles: ArchiveItem[]
  classFiles: ArchiveItem[]
  isAdmin: boolean
}) {
  const buildCombined = useCallback((conf: ArchiveItem[], cls: ArchiveItem[]): CombinedItem[] => {
    const all: CombinedItem[] = [
      ...conf.map((f) => ({ ...f, type: 'conf' as const })),
      ...cls.map((f) => ({ ...f, type: 'class' as const })),
    ]
    all.sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    })
    return all
  }, [])

  const [confFiles, setConfFiles] = useState(initialConf)
  const [classFiles, setClassFiles] = useState(initialClass)
  const [items, setItems] = useState<CombinedItem[]>(() => buildCombined(initialConf, initialClass))
  const [saving, setSaving] = useState(false)

  const handleWatch = useCallback((item: CombinedItem) => {
    const encodedSystemName = encodeURIComponent(item.systemName)
    const endpoint = item.type === 'conf'
      ? `/api/conf-archive/${encodedSystemName}/view`
      : `/api/class/${encodedSystemName}/view`

    fetch(endpoint, { method: 'POST', keepalive: true })
      .then((res) => {
        if (!res.ok) return
        setItems((prev) =>
          prev.map((current) =>
            current.id === item.id && current.type === item.type
              ? { ...current, views: current.views + 1 }
              : current
          )
        )
      })
      .catch(() => {})
  }, [])

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return

    const reordered = Array.from(items)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)

    const withNewIndex = reordered.map((item, idx) => ({ ...item, orderIndex: idx + 1 }))
    setItems(withNewIndex)

    setSaving(true)
    try {
      await fetch('/api/archive/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: withNewIndex.map(({ id, type, orderIndex }) => ({ id, type, orderIndex })),
        }),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (systemName: string, type: 'conf' | 'class') => {
    setItems((prev) => prev.filter((i) => !(i.systemName === systemName && i.type === type)))
    if (type === 'conf') setConfFiles((p) => p.filter((x) => x.systemName !== systemName))
    else setClassFiles((p) => p.filter((x) => x.systemName !== systemName))
  }

  if (items.length === 0) {
    return <p className="text-white/40 text-center py-12">Архив пуст</p>
  }

  if (!isAdmin) {
    return (
      <ul className="space-y-3">
        {items.map((f) => (
          <li key={`${f.type}-${f.id}`}>
            <FileItem item={f} isAdmin={false} onDelete={handleDelete} onWatch={handleWatch} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div>
      {saving && (
        <p className="text-xs text-white/40 mb-3 text-right">Сохраняю порядок...</p>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="archive">
          {(provided) => (
            <ul
              className="space-y-3"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {items.map((f, index) => (
                <Draggable key={`${f.type}-${f.id}`} draggableId={`${f.type}-${f.id}`} index={index}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'opacity-80 scale-[1.01]' : ''}
                    >
                      <FileItem
                        item={f}
                        isAdmin={isAdmin}
                        onDelete={handleDelete}
                        onWatch={handleWatch}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}
