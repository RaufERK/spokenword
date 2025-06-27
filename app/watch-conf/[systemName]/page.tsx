import ConferencePlayer from '@/components/ConferencePlayer'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSubscriptionActive } from '@/lib/subscription'

export default async function WatchConfFilePage({
  params,
}: {
  params: Promise<{ systemName: string }>
}) {
  const { systemName } = await params

  // 1. Проверка файла
  const file = await prisma.conferenceFile.findUnique({
    where: { systemName },
  })
  if (!file) return notFound()

  // 2. Проверка авторизации и оплаты
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  // Получаем актуальные данные пользователя (вдруг paymentDate обновился)
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
  })
  if (!user || !isSubscriptionActive(user.paymentDate)) {
    // Можно или redirect('/pay'), или вернуть кастомную страницу
    return (
      <div className='p-10 text-red-600 text-center'>
        Доступ только для оплаченных пользователей.
        <br />
        Пожалуйста, продлите подписку.
      </div>
    )
  }

  // 3. Всё ок, рендерим
  return (
    <main className='max-w-2xl mx-auto p-4'>
      <h1 className='text-2xl mb-4'>{file.displayName}</h1>
      <ConferencePlayer
        src={`/conf-archive/${encodeURIComponent(file.systemName)}`}
      />
    </main>
  )
}
