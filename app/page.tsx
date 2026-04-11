import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSubscriptionActive } from '@/lib/subscription'
import prisma from '@/lib/prisma'
import { Youtube, Play, Music } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  const paymentDate = session?.user?.paymentDate ?? null

  const hasClassAccess =
    role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER' ||
    isSubscriptionActive(paymentDate)

  let youtubeUrl: string | null = null
  let rutubeUrl: string | null = null

  const link = hasClassAccess
    ? await prisma.classStreamLink.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      })
    : await prisma.streamLink.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      })

  youtubeUrl = link?.youtubeUrl ?? null
  rutubeUrl = link?.rutubeUrl ?? null

  const platforms = [
    {
      id: 'youtube',
      label: 'YouTube',
      icon: Youtube,
      gradient: 'from-purple-600 to-purple-800',
      hoverGradient: 'hover:from-purple-500 hover:to-purple-700',
      url: youtubeUrl,
    },
    {
      id: 'rutube',
      label: 'Rutube',
      icon: Play,
      gradient: 'from-blue-600 to-blue-800',
      hoverGradient: 'hover:from-blue-500 hover:to-blue-700',
      url: rutubeUrl,
    },
    {
      id: 'audio',
      label: 'Аудио',
      icon: Music,
      gradient: 'from-green-600 to-green-800',
      hoverGradient: 'hover:from-green-500 hover:to-green-700',
      url: '/audio',
    },
  ]

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 w-full border border-white/10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 mb-4 shadow-lg shadow-purple-500/30">
            <Play className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl text-white mb-3">
            {hasClassAccess ? 'Подключение к трансляции класса' : 'Подключение к трансляции'}
          </h1>
          <p className="text-purple-200/80">
            {hasClassAccess
              ? 'Выберите платформу для просмотра текущего учебного класса'
              : 'Выберите платформу для просмотра текущего мероприятия'}
          </p>
        </div>

        {/* 3 stream buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map(({ id, label, icon: Icon, gradient, hoverGradient, url }) => {
            const isAvailable = !!url && (hasClassAccess || id === 'audio')
            const isAudio = id === 'audio'

            if (isAvailable) {
              return (
                <a
                  key={id}
                  href={url!}
                  target={isAudio ? '_self' : '_blank'}
                  rel={isAudio ? undefined : 'noopener noreferrer'}
                  className={`bg-gradient-to-br ${gradient} ${hoverGradient} rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer`}
                >
                  <Icon className="w-12 h-12 text-white" />
                  <span className="text-white text-lg font-medium">{label}</span>
                </a>
              )
            }

            // Недоступная кнопка (нет ссылки или нет доступа)
            return (
              <div
                key={id}
                className={`bg-gradient-to-br ${gradient} rounded-xl p-6 flex flex-col items-center justify-center gap-3 opacity-40 cursor-not-allowed select-none`}
              >
                <Icon className="w-12 h-12 text-white" />
                <span className="text-white text-lg font-medium">{label}</span>
                <span className="text-white/70 text-xs">
                  {hasClassAccess ? 'Ссылка не добавлена' : 'Нет доступа'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Info bar */}
        <div className="mt-8 p-4 bg-blue-900/30 rounded-xl border border-blue-400/20">
          <p className="text-blue-200 text-sm text-center">
            📅 {hasClassAccess
              ? 'Текущая трансляция: Учебный класс'
              : 'Текущая трансляция: Открытое мероприятие'}
          </p>
        </div>

        {/* No access warning */}
        {!session && (
          <div className="mt-4 p-4 bg-yellow-900/20 rounded-xl border border-yellow-400/20">
            <p className="text-yellow-200 text-sm text-center">
              Войдите в аккаунт для просмотра трансляций.{' '}
              <a href="/login" className="text-yellow-300 underline hover:text-yellow-200">Войти</a>
            </p>
          </div>
        )}

        {session && !hasClassAccess && (
          <div className="mt-4 p-4 bg-yellow-900/20 rounded-xl border border-yellow-400/20">
            <p className="text-yellow-200 text-sm text-center">
              ⚠️ У вас пока нет доступа к учебному классу. Свяжитесь с администратором для получения доступа.
            </p>
          </div>
        )}
      </div>

      {/* Archive link */}
      <div className="mt-8 text-center">
        <p className="text-purple-200/70 text-sm">
          Пропустили занятие?{' '}
          <a href="/conf-arch" className="text-green-400 hover:text-green-300 underline transition-colors">
            Смотрите записи в архиве
          </a>
        </p>
      </div>
    </main>
  )
}
