import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import PaidContentClient from './PaidContentClient'

export default async function PaidContentPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/login')
  }

  const userId = parseInt(session.user.id)

  // Загружаем все активные пакеты
  const allPackages = await prisma.contentPackage.findMany({
    where: { isActive: true },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          title: true,
          duration: true,
          orderIndex: true
        }
      },
      _count: {
        select: { purchases: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Загружаем доступы пользователя
  const userAccess = await prisma.userPackageAccess.findMany({
    where: { userId },
    include: {
      package: {
        include: {
          items: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              title: true,
              duration: true,
              orderIndex: true
            }
          }
        }
      }
    }
  })

  // Создаем карту доступов
  const accessMap = new Map(userAccess.map(access => [access.packageId, access]))

  // Разделяем пакеты на купленные и доступные для покупки
  const purchasedPackages = userAccess.map(access => ({
    ...access.package,
    price: Number(access.package.price), // Конвертируем Decimal в число
    purchaseDate: access.purchaseDate.toISOString(),
    purchasePrice: Number(access.price), // Конвертируем Decimal в число
    notes: access.notes
  }))

  const availablePackages = allPackages
    .filter(pkg => !accessMap.has(pkg.id))
    .map(pkg => ({
      ...pkg,
      price: Number(pkg.price) // Конвертируем Decimal в число
    }))

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Платные материалы</h1>
      
      <PaidContentClient 
        purchasedPackages={purchasedPackages}
        availablePackages={availablePackages}
        userRole={session.user.role}
      />
    </main>
  )
}
