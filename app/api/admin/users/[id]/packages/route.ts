import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 })
    }

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Загружаем все пакеты и проверяем доступ пользователя
    const allPackages = await prisma.contentPackage.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        price: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Загружаем доступы пользователя
    const userAccess = await prisma.userPackageAccess.findMany({
      where: { userId },
      select: {
        packageId: true,
        purchaseDate: true,
        notes: true
      }
    })

    // Создаем карту доступов для быстрого поиска
    const accessMap = new Map(
      userAccess.map(access => [
        access.packageId, 
        { 
          purchaseDate: access.purchaseDate.toISOString(), 
          notes: access.notes 
        }
      ])
    )

    // Формируем результат
    const packages = allPackages.map(pkg => ({
      id: pkg.id,
      title: pkg.title,
      price: pkg.price,
      hasAccess: accessMap.has(pkg.id),
      purchaseDate: accessMap.get(pkg.id)?.purchaseDate,
      notes: accessMap.get(pkg.id)?.notes
    }))

    return NextResponse.json({
      user,
      packages
    })

  } catch (error) {
    console.error('Error fetching user packages:', error)
    return NextResponse.json({ 
      message: 'Ошибка при загрузке данных' 
    }, { status: 500 })
  }
}
