import ConferencePlayer from '@/components/ConferencePlayer'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canAccessEventFile } from '@/lib/subscription'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

type Params = { systemName: string }

export default async function WatchClassFilePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { systemName } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const file = await prisma.classFile.findUnique({
    where: { systemName },
    include: { event: { select: { title: true } } },
  })
  if (!file) return notFound()

  const allowed = await canAccessEventFile({
    role: session.user.role,
    userId: Number(session.user.id),
    eventId: file.eventId,
    isPublic: file.isPublic,
  })

  if (!allowed) {
    return (
      <main className='max-w-2xl mx-auto p-4'>
        <h1 className='text-2xl mb-3 text-white'>Нет доступа</h1>
        <p className='text-white/70 mb-6'>
          Эта запись доступна только тем, кто оплатил
          {file.event?.title ? ` «${file.event.title}»` : ' соответствующее мероприятие'}
          , и пока срок доступа не истёк.
        </p>
        <Link href='/conf-arch' className='text-blue-400 hover:text-blue-300'>
          ← К архиву
        </Link>
      </main>
    )
  }

  return (
    <main className='max-w-2xl mx-auto p-4'>
      <h1 className='text-2xl mb-4'>{file.displayName}</h1>
      <ConferencePlayer
        src={`/api/class/${encodeURIComponent(file.systemName)}`}
        viewPath={`/api/class/${encodeURIComponent(file.systemName)}/view`}
      />
    </main>
  )
}
