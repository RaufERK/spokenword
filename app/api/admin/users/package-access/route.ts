import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { userId, packageId, notes } = await req.json()

    if (!userId || !packageId) {
      return NextResponse.json(
        {
          message: 'userId и packageId обязательны',
        },
        { status: 400 }
      )
    }

    // Проверяем существование пользователя и пакета
    const [user, pkg] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.contentPackage.findUnique({ where: { id: packageId } }),
    ])

    if (!user) {
      return NextResponse.json(
        { message: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    if (!pkg) {
      return NextResponse.json({ message: 'Пакет не найден' }, { status: 404 })
    }

    // Проверяем, нет ли уже доступа
    const existingAccess = await prisma.userPackageAccess.findUnique({
      where: {
        userId_packageId: { userId, packageId },
      },
    })

    if (existingAccess) {
      return NextResponse.json(
        {
          message: 'Доступ уже предоставлен',
        },
        { status: 400 }
      )
    }

    // Создаем доступ
    const newAccess = await prisma.userPackageAccess.create({
      data: {
        userId,
        packageId,
        price: pkg.price,
        grantedBy: parseInt(auth.user.id),
        notes: notes || null,
      },
    })

    return NextResponse.json({
      success: true,
      access: newAccess,
    })
  } catch (error) {
    console.error('Error granting access:', error)
    return NextResponse.json(
      {
        message: 'Ошибка при предоставлении доступа',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { userId, packageId } = await req.json()

    if (!userId || !packageId) {
      return NextResponse.json(
        {
          message: 'userId и packageId обязательны',
        },
        { status: 400 }
      )
    }

    // Удаляем доступ
    const deletedAccess = await prisma.userPackageAccess.delete({
      where: {
        userId_packageId: { userId, packageId },
      },
    })

    return NextResponse.json({
      success: true,
      deletedAccess,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        {
          message: 'Доступ не найден',
        },
        { status: 404 }
      )
    }

    console.error('Error removing access:', error)
    return NextResponse.json(
      {
        message: 'Ошибка при удалении доступа',
      },
      { status: 500 }
    )
  }
}
