import prisma from '@/lib/prisma'
import { requireRole } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const auth = await requireRole('SUPER')
    if (auth.error) return auth.error

    const { id } = await params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json({ 
        message: 'Неверный ID пользователя' 
      }, { status: 400 })
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        login: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        message: 'Пользователь не найден' 
      }, { status: 404 })
    }

    // Нельзя удалить SUPER админа
    if (user.role === 'SUPER') {
      return NextResponse.json({ 
        message: 'Нельзя удалить SUPER администратора' 
      }, { status: 400 })
    }

    // Нельзя удалить самого себя
    if (userId === parseInt(auth.user.id)) {
      return NextResponse.json({ 
        message: 'Нельзя удалить самого себя' 
      }, { status: 400 })
    }

    // Удаляем пользователя (каскадное удаление удалит связанные записи)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: `Пользователь ${user.firstName} ${user.lastName} успешно удален`,
      deletedUser: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        login: user.login
      }
    })

  } catch (error: unknown) {
    console.error('Error deleting user:', error)

    // Проверяем на ошибки связанных записей
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2003'
    ) {
      return NextResponse.json({
        message: 'Нельзя удалить пользователя - есть связанные записи',
      }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Ошибка при удалении пользователя',
    }, { status: 500 })
  }
}
