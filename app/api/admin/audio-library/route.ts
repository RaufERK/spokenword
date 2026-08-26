import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { isStaffRole } from '@/lib/roles'
import { slugify } from 'transliteration'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

function serializeLecture(lecture: {
  id: number
  title: string
  year: number | null
  description: string | null
  originalName: string
  systemName: string
  size: bigint
  durationSec: number | null
  isPublished: boolean
  uploadedAt: Date
  categories: { id: number; name: string; slug: string }[]
}) {
  return {
    ...lecture,
    size: Number(lecture.size),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [lectures, categories] = await Promise.all([
    prisma.audioLecture.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { categories: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.audioCategory.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      lectures: lectures.map(serializeLecture),
      categories,
    },
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = slugify(name, { lowercase: true, separator: '-' }) || `cat-${Date.now()}`

  try {
    const category = await prisma.audioCategory.create({
      data: { name, slug },
    })
    return NextResponse.json({ success: true, data: category })
  } catch {
    return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
  }
}
