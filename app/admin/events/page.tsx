import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import EventsClient from './EventsClient'

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)) {
    redirect('/')
  }

  const events = await prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    select: {
      id: true,
      title: true,
      type: true,
      startDate: true,
      accessDays: true,
      createdAt: true,
      _count: {
        select: {
          payments: { where: { status: 'ACTIVE' } },
          files: true,
        },
      },
    },
  })

  const canEdit = ['ADMIN', 'SUPER'].includes(session.user.role)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Мероприятия</h1>
          <p className="text-pink-300/60 text-sm mt-1">Всего: {events.length}</p>
        </div>
      </div>
      <EventsClient
        initialEvents={events.map((e) => ({
          ...e,
          startDate: e.startDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
        }))}
        canEdit={canEdit}
      />
    </div>
  )
}
