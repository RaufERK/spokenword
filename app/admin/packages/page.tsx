import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PackagesClient from './PackagesClient'

export default async function AdminPackagesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
    redirect('/login')
  }

  // Загружаем все пакеты
  const packages = await prisma.contentPackage.findMany({
    include: {
      items: {
        orderBy: { orderIndex: 'asc' }
      },
      uploader: {
        select: { firstName: true, lastName: true }
      },
      _count: {
        select: { purchases: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Конвертируем Decimal в число для клиента
  const packagesForClient = packages.map(pkg => ({
    ...pkg,
    price: Number(pkg.price),
    createdAt: pkg.createdAt.toISOString()
  }))

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Платные материалы</h1>
          <p className="text-pink-300/50 text-xs mt-0.5">Пакетов: {packagesForClient.length}</p>
        </div>
        <Link
          href="/admin/packages/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium transition-colors shadow-md"
        >
          <span className="text-lg leading-none">+</span>
          Создать пакет
        </Link>
      </div>
      <PackagesClient packages={packagesForClient} />
    </div>
  )
}
