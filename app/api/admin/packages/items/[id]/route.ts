import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { getServerSession } from 'next-auth'
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

interface Props {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { id } = await params
    const itemId = parseInt(id)

    if (isNaN(itemId)) {
      return NextResponse.json({ message: 'Invalid item ID' }, { status: 400 })
    }

    // Находим лекцию
    const item = await prisma.packageItem.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return NextResponse.json({ 
        message: 'Лекция не найдена' 
      }, { status: 404 })
    }

    // Удаляем физический файл
    try {
      const filePath = getPaidContentFilePath(item.filePath)
      if (filePath) {
        await unlink(filePath)
      }
    } catch (fileError) {
      console.warn(`Could not delete file: ${item.filePath}`, fileError)
    }

    // Удаляем из БД
    await prisma.packageItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({
      success: true,
      message: 'Лекция успешно удалена'
    })

  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ 
      message: 'Ошибка при удалении лекции' 
    }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверяем права доступа
    if (!session?.user || !['ADMIN', 'SUPER'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 })
    }

    const { id } = await params
    const itemId = parseInt(id)
    const { title } = await req.json()

    if (isNaN(itemId)) {
      return NextResponse.json({ message: 'Invalid item ID' }, { status: 400 })
    }

    if (!title || title.trim() === '') {
      return NextResponse.json({ 
        message: 'Название обязательно' 
      }, { status: 400 })
    }

    // Обновляем название
    const updatedItem = await prisma.packageItem.update({
      where: { id: itemId },
      data: { title: title.trim() }
    })

    // Convert BigInt to Number for JSON serialization
    const itemWithConvertedSizes = {
      ...updatedItem,
      originalSize: Number(updatedItem.originalSize),
      compressedSize: Number(updatedItem.compressedSize)
    }

    return NextResponse.json({
      success: true,
      item: itemWithConvertedSizes
    })

  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ 
      message: 'Ошибка при обновлении лекции' 
    }, { status: 500 })
  }
}
