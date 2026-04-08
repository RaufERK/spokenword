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

  const [confFiles, classFiles, streamLinks, classStreamLinks] = await Promise.all([
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
    prisma.streamLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.classStreamLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const hasLiveStream =
    streamLinks?.youtubeUrl ||
    streamLinks?.rutubeUrl ||
    classStreamLinks?.youtubeUrl ||
    classStreamLinks?.rutubeUrl

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1 text-white">Архив</h1>
      <p className="text-white/50 text-sm mb-6">Записи конференций и учебных занятий</p>

      {hasLiveStream && (
        <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 font-semibold text-sm">Сейчас идёт трансляция</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {streamLinks?.youtubeUrl && (
              <a
                href={streamLinks.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                YouTube (Служба)
              </a>
            )}
            {streamLinks?.rutubeUrl && (
              <a
                href={streamLinks.rutubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Rutube (Служба)
              </a>
            )}
            {classStreamLinks?.youtubeUrl && (
              <a
                href={classStreamLinks.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                YouTube (Класс)
              </a>
            )}
            {classStreamLinks?.rutubeUrl && (
              <a
                href={classStreamLinks.rutubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Rutube (Класс)
              </a>
            )}
          </div>
        </div>
      )}

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
