import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import ArchiveList from './ArchiveList'

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')

  const role = (session.user as { role?: string })?.role || ''
  const isAdmin = ['MODERATOR', 'ADMIN', 'SUPER'].includes(role)

  const [confFiles, classFiles] = await Promise.all([
    prisma.conferenceFile.findMany({
      where: isAdmin ? {} : { isPublic: true },
      orderBy: [{ orderIndex: 'asc' }, { uploadedAt: 'desc' }],
      select: {
        id: true,
        displayName: true,
        systemName: true,
        size: true,
        uploadedAt: true,
        views: true,
        isPublic: true,
        duration: true,
        orderIndex: true,
      },
    }),
    prisma.classFile.findMany({
      where: isAdmin ? {} : { isPublic: true },
      orderBy: [{ orderIndex: 'asc' }, { uploadedAt: 'desc' }],
      select: {
        id: true,
        displayName: true,
        systemName: true,
        size: true,
        uploadedAt: true,
        views: true,
        isPublic: true,
        duration: true,
        orderIndex: true,
      },
    }),
  ])

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1 text-white">Архив</h1>
      <p className="text-white/50 text-sm mb-6">Записи мероприятий</p>

      <ArchiveList
        confFiles={confFiles.map((f) => ({
          ...f,
          size: Number(f.size),
          uploadedAt: f.uploadedAt.toISOString(),
        }))}
        classFiles={classFiles.map((f) => ({
          ...f,
          size: Number(f.size),
          uploadedAt: f.uploadedAt.toISOString(),
        }))}
        isAdmin={isAdmin}
      />

    </main>
  )
}
