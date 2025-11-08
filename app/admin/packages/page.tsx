import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <main className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление пакетами материалов</h1>
        <Link 
          href="/admin/packages/create"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Создать пакет
        </Link>
      </div>

      <PackagesClient packages={packagesForClient} />
    </main>
  )
}
