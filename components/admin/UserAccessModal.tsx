'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserRow } from '@/app/admin/users/UsersTable'

interface Package {
  id: number
  title: string
  price: number
  hasAccess: boolean
  purchaseDate?: string
  notes?: string
}

interface Props {
  user: UserRow | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function UserAccessModal({ user, isOpen, onClose, onSave }: Props) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')

  const loadUserPackages = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/packages`)
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages)
      }
    } catch (error) {
      console.error('Error loading packages:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isOpen && user) {
      loadUserPackages()
    }
  }, [isOpen, user, loadUserPackages])

  const toggleAccess = async (packageId: number, hasAccess: boolean) => {
    if (!user) return

    setSaving(true)
    try {
      const method = hasAccess ? 'DELETE' : 'POST'
      const body = hasAccess ? 
        JSON.stringify({ userId: user.id, packageId }) :
        JSON.stringify({ userId: user.id, packageId, notes: newNote })

      const response = await fetch('/api/admin/users/package-access', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      })

      if (response.ok) {
        await loadUserPackages()
        setNewNote('')
        onSave()
      } else {
        alert('Ошибка при изменении доступа')
      }
    } catch {
      alert('Произошла ошибка')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Доступ к материалам: {user.firstName} {user.lastName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p>Загрузка...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Пакетов материалов пока нет
              </p>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={pkg.hasAccess}
                        onChange={(e) => toggleAccess(pkg.id, !e.target.checked)}
                        disabled={saving}
                        className="h-5 w-5 text-blue-600 rounded"
                      />
                      <div>
                        <h3 className="font-medium">{pkg.title}</h3>
                        <p className="text-sm text-gray-600">{pkg.price.toString()}₽</p>
                        {pkg.hasAccess && pkg.purchaseDate && (
                          <p className="text-xs text-green-600 mt-1">
                            Куплено: {new Date(pkg.purchaseDate).toLocaleDateString()}
                            {pkg.notes && ` • ${pkg.notes}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {packages.some(p => !p.hasAccess) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Заметка о покупке (способ оплаты, комментарий):
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Например: Перевод на карту, наличные..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Заметка будет добавлена при предоставлении доступа к новому материалу
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
