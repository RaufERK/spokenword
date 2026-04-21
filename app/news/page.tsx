import prisma from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DeleteNewsPostButton from './DeleteNewsPostButton'
import NewsAutoRefresh from './NewsAutoRefresh'
import { renderTelegramText } from './renderTelegramText'

export const dynamic = 'force-dynamic'

type NewsPageSearchParams = Promise<{
  tag?: string | string[]
  view?: string | string[]
}>

function formatTelegramDate(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeTag(value: string | string[] | undefined): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (!rawValue) {
    return null
  }

  const normalizedValue = rawValue.trim().replace(/^#/, '')
  return normalizedValue.length > 0 ? normalizedValue : null
}

function getTagHref(tag: string): string {
  return `/news?tag=${encodeURIComponent(tag)}`
}

function normalizeView(value: string | string[] | undefined): 'all' | 'test' | 'channel' {
  const rawValue = Array.isArray(value) ? value[0] : value
  if (rawValue === 'test') {
    return 'test'
  }

  if (rawValue === 'channel') {
    return 'channel'
  }

  return 'all'
}

function buildNewsHref({
  tag,
  view,
}: {
  tag?: string | null
  view?: 'all' | 'test' | 'channel'
}): string {
  const params = new URLSearchParams()

  if (tag) {
    params.set('tag', tag)
  }

  if (view && view !== 'all') {
    params.set('view', view)
  }

  const query = params.toString()
  return query.length > 0 ? `/news?${query}` : '/news'
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: NewsPageSearchParams
}) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  const canViewTestPosts = role === 'ADMIN' || role === 'SUPER'
  const canManagePosts = role === 'MODERATOR' || role === 'ADMIN' || role === 'SUPER'
  const testChannelId = process.env.TEST_CHANNEL_ID?.trim() ?? null
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const activeTag = normalizeTag(resolvedSearchParams?.tag)
  const activeView = canViewTestPosts ? normalizeView(resolvedSearchParams?.view) : 'all'

  const posts = await prisma.channelPost.findMany({
    where: {
      AND: [
        { isDeleted: false },
        ...(activeTag
          ? [
              {
                hashtags: {
                  has: activeTag,
                },
              },
            ]
          : []),
        ...(testChannelId
          ? canViewTestPosts
            ? activeView === 'test'
              ? [{ channelId: testChannelId }]
              : activeView === 'channel'
                ? [{ NOT: { channelId: testChannelId } }]
                : []
            : [{ NOT: { channelId: testChannelId } }]
          : []),
        {
          OR: [
            { text: { not: null } },
            { imageUrl: { not: null } },
          ],
        },
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
        <p className='text-white/60 text-sm mt-1'>
          {activeTag ? `Фильтр по хештегу #${activeTag}` : 'Зеркало Telegram-канала'}
        </p>
      </div>

      {canViewTestPosts && testChannelId && (
        <div className='mb-4 flex flex-wrap gap-2'>
          <Link
            href={buildNewsHref({ tag: activeTag, view: 'all' })}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              activeView === 'all'
                ? 'border-purple-400/40 bg-purple-500/15 text-white'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-purple-400/30 hover:text-white'
            }`}
          >
            Все сообщения
          </Link>
          <Link
            href={buildNewsHref({ tag: activeTag, view: 'test' })}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              activeView === 'test'
                ? 'border-yellow-400/40 bg-yellow-500/15 text-yellow-100'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-yellow-400/30 hover:text-white'
            }`}
          >
            Тестовые
          </Link>
          <Link
            href={buildNewsHref({ tag: activeTag, view: 'channel' })}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              activeView === 'channel'
                ? 'border-green-400/40 bg-green-500/15 text-green-100'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-green-400/30 hover:text-white'
            }`}
          >
            Канал
          </Link>
        </div>
      )}

      {activeTag && (
        <div className='mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4'>
          <span className='inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-sm text-blue-200'>
            #{activeTag}
          </span>
          <Link
            href={buildNewsHref({ view: activeView })}
            className='text-sm text-white/70 underline underline-offset-4 hover:text-white'
          >
            Сбросить фильтр
          </Link>
        </div>
      )}

      {posts.length === 0 ? (
        <div className='rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70'>
          {activeTag
            ? `По хештегу #${activeTag} пока нет опубликованных новостей.`
            : 'Пока нет опубликованных новостей.'}
        </div>
      ) : (
        <div className='space-y-4'>
          {posts.map((post) => (
            <article
              key={`${post.channelId}-${post.telegramMessageId}`}
              className='rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5'
            >
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <p className='text-xs text-white/50'>
                    Пост #{post.telegramMessageId}
                  </p>
                  {canManagePosts && (
                    <DeleteNewsPostButton
                      postId={post.id}
                      telegramMessageId={post.telegramMessageId}
                    />
                  )}
                </div>
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

              {post.hashtags.length > 0 && (
                <div className='mt-4 flex flex-wrap gap-2'>
                  {post.hashtags.map((tag) => {
                    const isActiveTag = activeTag === tag

                    return (
                      <Link
                        key={`${post.id}-${tag}`}
                        href={buildNewsHref({ tag, view: activeView })}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          isActiveTag
                            ? 'border-blue-400/40 bg-blue-500/15 text-blue-200'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-blue-400/30 hover:text-blue-200'
                        }`}
                      >
                        #{tag}
                      </Link>
                    )
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
