'use client'

import { useState } from 'react'
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

export default function PaidContentClient({ 
  purchasedPackages, 
  availablePackages, 
  userRole 
}: Props) {
  const [expandedPackages, setExpandedPackages] = useState<Set<number>>(new Set())

  const togglePackage = (packageId: number) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(packageId)) {
        newSet.delete(packageId)
      } else {
        newSet.add(packageId)
      }
      return newSet
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return ''
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalDuration = (items: PackageItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.duration || 0), 0)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}ч ${minutes}мин`
    }
    return `${minutes}мин`
  }

  // Проверяем, есть ли у пользователя права модератора/админа
  const hasModeratorAccess = ['MODERATOR', 'ADMIN', 'SUPER'].includes(userRole)

  return (
    <div className="space-y-8">
      {/* Купленные материалы */}
      {(purchasedPackages.length > 0 || hasModeratorAccess) && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-green-700">
            {hasModeratorAccess ? 'Все материалы (доступ по роли)' : 'Ваши материалы'}
          </h2>
          
          {purchasedPackages.length === 0 && hasModeratorAccess && (
            <p className="text-gray-500 mb-4">
              У вас есть доступ ко всем материалам благодаря вашей роли, но пакетов пока нет.
            </p>
          )}
          
          <div className="space-y-4">
            {(hasModeratorAccess ? [...purchasedPackages, ...availablePackages] : purchasedPackages).map(pkg => (
              <div key={pkg.id} className="border rounded-lg bg-green-50 border-green-200">
                <div 
                  className="p-4 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => togglePackage(pkg.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-green-800">{pkg.title}</h3>
                      {pkg.description && (
                        <p className="text-green-700 mt-1">{pkg.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-green-600">
                        <span>🎬 {pkg.items.length} лекций</span>
                        <span>⏱️ {getTotalDuration(pkg.items)}</span>
                        {'purchaseDate' in pkg && (
                          <span>💰 Куплено: {new Date(pkg.purchaseDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700">{pkg.price}₽</p>
                      <button className="text-green-600 hover:text-green-800 text-sm">
                        {expandedPackages.has(pkg.id) ? '▼ Свернуть' : '▶ Развернуть'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {expandedPackages.has(pkg.id) && (
                  <div className="border-t border-green-200 p-4 bg-white">
                    <div className="space-y-3">
                      {pkg.items.map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{item.title}</h4>
                              {item.duration && (
                                <p className="text-sm text-gray-500">
                                  Длительность: {formatDuration(item.duration)}
                                </p>
                              )}
                            </div>
                          </div>
                          <VideoPlayer 
                            packageId={pkg.id}
                            itemId={item.id}
                            title={item.title}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Доступные для покупки */}
      {!hasModeratorAccess && availablePackages.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Доступные для покупки</h2>
          <div className="space-y-4">
            {availablePackages.map(pkg => (
              <div key={pkg.id} className="border rounded-lg bg-blue-50 border-blue-200 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-blue-800">{pkg.title}</h3>
                    {pkg.description && (
                      <p className="text-blue-700 mt-1">{pkg.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                      <span>🎬 {pkg.items.length} лекций</span>
                      <span>⏱️ {getTotalDuration(pkg.items)}</span>
                      {pkg._count && (
                        <span>👥 {pkg._count.purchases} покупок</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700 mb-2">{pkg.price}₽</p>
                    <div className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
                      Свяжитесь с администратором
                    </div>
                  </div>
                </div>
                
                {pkg.items.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Содержание:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-gray-600">
                      {pkg.items.slice(0, 6).map(item => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.title}</span>
                          <span>{formatDuration(item.duration)}</span>
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
            ))}
          </div>
        </section>
      )}

      {/* Если нет материалов вообще */}
      {purchasedPackages.length === 0 && availablePackages.length === 0 && !hasModeratorAccess && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Платных материалов пока нет
          </h2>
          <p className="text-gray-500">
            Скоро здесь появятся интересные материалы для изучения
          </p>
        </div>
      )}

      {/* Если у пользователя нет купленных материалов, но есть доступные */}
      {purchasedPackages.length === 0 && availablePackages.length > 0 && !hasModeratorAccess && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">
            У вас пока нет доступа к платным материалам
          </h3>
          <p className="text-yellow-700 text-sm">
            Свяжитесь с администратором для получения доступа к интересующим вас материалам.
          </p>
        </div>
      )}
    </div>
  )
}
