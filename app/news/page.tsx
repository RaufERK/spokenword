import prisma from '@/lib/prisma'
import Image from 'next/image'
import NewsAutoRefresh from './NewsAutoRefresh'
import { renderTelegramText } from './renderTelegramText'

export const dynamic = 'force-dynamic'

function formatTelegramDate(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function NewsPage() {
  const posts = await prisma.channelPost.findMany({
    where: {
      isDeleted: false,
      OR: [
        { text: { not: null } },
        { imageUrl: { not: null } },
      ],
    },
    orderBy: [{ telegramDate: 'desc' }, { id: 'desc' }],
    take: 200,
  })

  return (
    <main className='max-w-4xl mx-auto px-4 py-6 sm:py-8'>
      <NewsAutoRefresh />

      <div className='mb-6'>
        <h1 className='text-2xl sm:text-3xl text-white font-semibold'>Новости</h1>
        <p className='text-white/60 text-sm mt-1'>Зеркало Telegram-канала</p>
      </div>

      {posts.length === 0 ? (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70'>
          Пока нет опубликованных новостей.
        </div>
      ) : (
        <div className='space-y-4'>
          {posts.map((post) => (
            <article
              key={`${post.channelId}-${post.telegramMessageId}`}
              className='rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5'
            >
              <div className='flex items-center justify-between gap-3 mb-3'>
                <p className='text-xs text-white/50'>
                  Пост #{post.telegramMessageId}
                </p>
                <time className='text-xs text-white/50'>
                  {formatTelegramDate(post.telegramDate)}
                </time>
              </div>

              {post.text && (
                <div className='text-white whitespace-pre-wrap leading-relaxed'>
                  {renderTelegramText(post.text, post.textEntities)}
                </div>
              )}

              {post.imageUrl && (
                <div className={post.text ? 'mt-4' : ''}>
                  <Image
                    src={post.imageUrl}
                    alt={post.text ? post.text.slice(0, 80) : 'Новостное изображение'}
                    width={1280}
                    height={720}
                    sizes='(max-width: 768px) 100vw, 800px'
                    className='w-full h-auto rounded-xl border border-white/10'
                    unoptimized
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
