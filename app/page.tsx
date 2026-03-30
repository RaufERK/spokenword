import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSubscriptionActive } from '@/lib/subscription'
import prisma from '@/lib/prisma'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  const paymentDate = session?.user?.paymentDate ?? null

  const hasClassAccess =
    role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER' ||
    isSubscriptionActive(paymentDate)

  // Ссылки показываем только тем у кого есть доступ
  let youtubeUrl: string | null = null
  let rutubeUrl: string | null = null

  if (hasClassAccess) {
    const link = await prisma.classStreamLink.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    youtubeUrl = link?.youtubeUrl ?? null
    rutubeUrl = link?.rutubeUrl ?? null
  }

  return (
    <main className='flex flex-col items-center gap-6 p-4 pt-10'>
      {hasClassAccess && (youtubeUrl || rutubeUrl) ? (
        <div className='w-full max-w-3xl bg-purple-900/60 backdrop-blur-sm border border-blue-600/40 rounded-2xl p-6'>
          <h2 className='text-xl font-semibold text-green-400 mb-2 text-center'>
            🎓 Класс — прямая трансляция
          </h2>
          <p className='text-purple-300 text-sm text-center mb-5'>
            Выберите платформу для подключения
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center items-stretch'>
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105'
              >
                <svg className='w-7 h-7' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' />
                </svg>
                <span>YouTube</span>
              </a>
            )}
            {rutubeUrl && (
              <a
                href={rutubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105'
              >
                <svg className='w-7 h-7' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' />
                </svg>
                <span>Rutube</span>
              </a>
            )}
          </div>
        </div>
      ) : hasClassAccess ? (
        <div className='w-full max-w-3xl bg-purple-900/40 backdrop-blur-sm border border-purple-700/40 rounded-2xl p-8 text-center'>
          <div className='text-4xl mb-4'>🎓</div>
          <h2 className='text-xl font-semibold text-white mb-2'>Трансляция Класса</h2>
          <p className='text-purple-300'>В данный момент трансляция не ведётся</p>
        </div>
      ) : (
        <div className='w-full max-w-3xl bg-purple-900/40 backdrop-blur-sm border border-purple-700/40 rounded-2xl p-8 text-center'>
          <div className='text-4xl mb-4'>👋</div>
          <h2 className='text-xl font-semibold text-white mb-2'>
            {session ? 'Добро пожаловать!' : 'Добро пожаловать!'}
          </h2>
          <p className='text-purple-300 text-sm'>
            {session
              ? 'Для доступа к трансляции Класса необходима активная подписка.'
              : 'Войдите в аккаунт для просмотра трансляций.'}
          </p>
        </div>
      )}
    </main>
  )
}
