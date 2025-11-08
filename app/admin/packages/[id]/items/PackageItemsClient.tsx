'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PackageItem {
  id: number
  title: string
  fileName: string
  duration: number | null
  orderIndex: number
  compressedSize: number
  createdAt: string
}

interface Props {
  items: PackageItem[]
  packageId: number
}

export default function PackageItemsClient({ items: initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleDelete = async (itemId: number, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить лекцию "${title}"?\n\nФайл будет удален с сервера.`)) {
      return
    }

    setDeletingId(itemId)

    try {
      const response = await fetch(`/api/admin/packages/items/${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId))
        router.refresh()
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch {
      alert('Произошла ошибка при удалении лекции')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (item: PackageItem) => {
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  const handleSaveEdit = async (itemId: number) => {
    if (!editTitle.trim()) {
      alert('Название не может быть пустым')
      return
    }

    try {
      const response = await fetch(`/api/admin/packages/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      })

      if (response.ok) {
        const { item } = await response.json()
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, title: item.title } : i))
        setEditingId(null)
        setEditTitle('')
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch {
      alert('Произошла ошибка при сохранении')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Лекций пока нет. Загрузите первые видео файлы выше.</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {items.map((item) => (
        <div key={item.id} className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
              {item.orderIndex}
            </div>
            <div className="flex-1">
              {editingId === item.id ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(item.id)
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(item.id)}
                    className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                  >
                    ✓
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-600 text-white px-2 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(item.compressedSize)} • 
                    {item.duration ? formatDuration(item.duration) : 'Длительность неизвестна'} • 
                    Загружено: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>
          </div>
          
          {editingId !== item.id && (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleEdit(item)}
                className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50"
              >
                Переименовать
              </button>
              <button 
                onClick={() => handleDelete(item.id, item.title)}
                disabled={deletingId === item.id}
                className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === item.id ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
