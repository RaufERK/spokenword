import prisma from '@/lib/prisma'
import { rmdir, unlink } from 'fs/promises'
import { requireAdmin } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'
import { join, relative, resolve } from 'path'

const PAID_CONTENT_DIR = join(process.cwd(), 'paid-content')

function getPaidContentFilePath(filePath: string) {
  const relativePath = filePath
    .replace(/^\/?paid-content\/?/, '')
    .replace(/^\/+/, '')
  const resolvedPath = resolve(PAID_CONTENT_DIR, relativePath)
  const pathFromBase = relative(PAID_CONTENT_DIR, resolvedPath)

  if (!pathFromBase || pathFromBase.startsWith('..')) {
    return null
  }

  return resolvedPath
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    console.log('🔍 Сессия пользователя:', {
      id: auth.user.id,
      login: auth.user.login || auth.user.name,
      role: auth.user.role
    })

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

    // Проверяем существование пользователя
    const userId = parseInt(auth.user.id)
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!userExists) {
      console.error('❌ Пользователь не найден в БД:', userId, auth.user.login)
      return NextResponse.json({ 
        message: `Пользователь с ID ${userId} не найден в базе данных` 
      }, { status: 400 })
    }

    console.log('✅ Создаем пакет от пользователя:', userExists.login, userExists.role)

    // Создаем пакет
    const newPackage = await prisma.contentPackage.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        uploadedBy: userId
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
    const auth = await requireAdmin()
    if (auth.error) return auth.error

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

    // Convert BigInt to Number for JSON serialization
    const packagesWithConvertedSizes = packages.map(pkg => ({
      ...pkg,
      items: pkg.items.map(item => ({
        ...item,
        compressedSize: Number(item.compressedSize)
      }))
    }))

    return NextResponse.json(packagesWithConvertedSizes)
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json({ 
      message: 'Ошибка при загрузке пакетов' 
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

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
    for (const item of pkg.items) {
      try {
        const filePath = getPaidContentFilePath(item.filePath)
        if (filePath) {
          await unlink(filePath)
        }
      } catch (fileError) {
        console.warn(`Could not delete file: ${item.filePath}`, fileError)
      }
    }

    // Удаляем папку пакета если пустая
    try {
      const packageDir = join(PAID_CONTENT_DIR, 'packages', `package_${packageId}`)
      await rmdir(packageDir)
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
