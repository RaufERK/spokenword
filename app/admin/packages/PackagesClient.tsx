'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  uploader: {
    firstName: string
    lastName: string
  }
  _count: {
    purchases: number
  }
  createdAt: string
  isActive: boolean
}

interface Props {
  packages: Package[]
}

export default function PackagesClient({ packages: initialPackages }: Props) {
  const router = useRouter()
  const [packages, setPackages] = useState(initialPackages)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (packageId: number, title: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пакет "${title}"?\n\nЭто действие нельзя отменить. Все файлы и данные о покупках будут удалены.`)) {
      return
    }

    setDeletingId(packageId)

    try {
      const response = await fetch('/api/admin/packages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      })

      if (response.ok) {
        setPackages(prev => prev.filter(pkg => pkg.id !== packageId))
        alert('Пакет успешно удален')
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.message}`)
      }
    } catch (error) {
      alert('Произошла ошибка при удалении пакета')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleActive = async (packageId: number, currentActive: boolean) => {
    // TODO: Реализовать переключение активности
    alert('Функция скоро будет добавлена')
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Пакетов пока нет</p>
        <Link 
          href="/admin/packages/create"
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          Создать первый пакет
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {packages.map(pkg => (
        <div key={pkg.id} className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">{pkg.title}</h2>
              {pkg.description && (
                <p className="text-gray-600 mt-1">{pkg.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{pkg.price}₽</p>
              <p className="text-sm text-gray-500">
                {pkg._count.purchases} покупок
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Лекций: {pkg.items.length} | 
              Создано: {new Date(pkg.createdAt).toLocaleDateString()} | 
              Автор: {pkg.uploader.firstName} {pkg.uploader.lastName}
            </p>
            
            {pkg.items.length > 0 && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium mb-2">Содержание:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                  {pkg.items.slice(0, 6).map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.title}</span>
                      <span className="text-gray-500">
                        {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : ''}
                      </span>
                    </div>
                  ))}
                  {pkg.items.length > 6 && (
                    <p className="text-gray-500 col-span-2">
                      ... и еще {pkg.items.length - 6} лекций
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={`/admin/packages/${pkg.id}/items`}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Управление лекциями
            </Link>
            
            <button
              onClick={() => toggleActive(pkg.id, pkg.isActive)}
              className={`px-3 py-1 rounded text-sm ${
                pkg.isActive 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {pkg.isActive ? 'Деактивировать' : 'Активировать'}
            </button>

            <button
              onClick={() => handleDelete(pkg.id, pkg.title)}
              disabled={deletingId === pkg.id}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === pkg.id ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
