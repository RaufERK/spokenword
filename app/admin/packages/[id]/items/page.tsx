import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AudioUploader from '@/components/admin/AudioUploader'
import PackageItemsClient from './PackageItemsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PackageItemsPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    redirect('/login')
  }

  const { id } = await params
  const packageId = parseInt(id)
  if (isNaN(packageId)) {
    notFound()
  }

  // Загружаем пакет с лекциями
  const pkg = await prisma.contentPackage.findUnique({
    where: { id: packageId },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' }
      },
      uploader: {
        select: { firstName: true, lastName: true }
      }
    }
  })

  if (!pkg) {
    notFound()
  }

  // Подсчитываем общую статистику
  const totalSize = pkg.items.reduce((sum, item) => sum + Number(item.compressedSize), 0)
  const totalDuration = pkg.items.reduce((sum, item) => sum + (item.duration || 0), 0)

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

  return (
    <main className="p-6">
      <div className="mb-6">
        <Link 
          href="/admin/packages"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Назад к пакетам
        </Link>
        <h1 className="text-2xl font-bold">{pkg.title}</h1>
        <p className="text-gray-600 mt-1">
          Управление лекциями | Цена: {pkg.price.toString()}₽ | 
          Автор: {pkg.uploader.firstName} {pkg.uploader.lastName}
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900">Лекций</h3>
          <p className="text-2xl font-bold text-blue-600">{pkg.items.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-900">Общий размер</h3>
          <p className="text-2xl font-bold text-green-600">{formatFileSize(totalSize)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-medium text-purple-900">Длительность</h3>
          <p className="text-2xl font-bold text-purple-600">{formatDuration(totalDuration)}</p>
        </div>
      </div>

      {/* Загрузка новых файлов */}
      <div className="mb-8">
        <AudioUploader packageId={packageId} />
      </div>

      {/* Список лекций */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Лекции в пакете</h2>
        </div>
        
        <PackageItemsClient 
          items={pkg.items.map(item => ({
            ...item,
            originalSize: Number(item.originalSize),
            compressedSize: Number(item.compressedSize),
            createdAt: item.createdAt.toISOString()
          }))}
          packageId={packageId}
        />
      </div>
    </main>
  )
}
