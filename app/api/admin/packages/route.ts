import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { title, description, price } = await req.json()

    // Валидация
    if (!title || !price) {
      return NextResponse.json({ 
        message: 'Название и цена обязательны' 
      }, { status: 400 })
    }

    if (price <= 0) {
      return NextResponse.json({ 
        message: 'Цена должна быть больше нуля' 
      }, { status: 400 })
    }

    // Создаем пакет
    const newPackage = await prisma.contentPackage.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        uploadedBy: parseInt(session.user.id)
      },
      include: {
        uploader: {
          select: { firstName: true, lastName: true }
        }
      }
    })

    return NextResponse.json(newPackage, { status: 201 })
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json({ 
      message: 'Ошибка при создании пакета' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    // Загружаем все пакеты
    const packages = await prisma.contentPackage.findMany({
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            duration: true,
            compressedSize: true
          }
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

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json({ 
      message: 'Ошибка при загрузке пакетов' 
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { packageId } = await req.json()

    if (!packageId) {
      return NextResponse.json({ 
        message: 'ID пакета обязателен' 
      }, { status: 400 })
    }

    // Находим пакет с файлами
    const pkg = await prisma.contentPackage.findUnique({
      where: { id: packageId },
      include: { items: true }
    })

    if (!pkg) {
      return NextResponse.json({ 
        message: 'Пакет не найден' 
      }, { status: 404 })
    }

    // Удаляем физические файлы
    const fs = await import('fs').then(m => m.promises)
    const path = await import('path')
    
    for (const item of pkg.items) {
      try {
        const filePath = path.join(process.cwd(), item.filePath.replace(/^\//, ''))
        await fs.unlink(filePath)
      } catch (fileError) {
        console.warn(`Could not delete file: ${item.filePath}`, fileError)
      }
    }

    // Удаляем папку пакета если пустая
    try {
      const packageDir = path.join(process.cwd(), 'paid-content', 'packages', `package_${packageId}`)
      await fs.rmdir(packageDir)
    } catch (dirError) {
      console.warn(`Could not delete package directory`, dirError)
    }

    // Удаляем из БД (каскадное удаление удалит items и purchases)
    await prisma.contentPackage.delete({
      where: { id: packageId }
    })

    return NextResponse.json({
      success: true,
      message: 'Пакет успешно удален'
    })

  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json({ 
      message: 'Ошибка при удалении пакета' 
    }, { status: 500 })
  }
}
