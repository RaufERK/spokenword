import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const NEWS_MEDIA_DIR =
  process.env.NODE_ENV === 'production'
    ? '/home/appuser/apps/spokenword/shared/public/news-media'
    : path.resolve(process.cwd(), 'public/news-media')

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const postId = Number(id)

  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  const post = await prisma.channelPost.findUnique({
    where: { id: postId },
    select: { id: true, imageUrl: true },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  await prisma.channelPost.delete({
    where: { id: postId },
  })

  if (post.imageUrl?.startsWith('/news-media/')) {
    const fileName = post.imageUrl.replace('/news-media/', '')

    if (fileName) {
      try {
        await unlink(path.join(NEWS_MEDIA_DIR, fileName))
      } catch {
        // ignore missing files
      }
    }
  }

  return NextResponse.json({ ok: true })
}
