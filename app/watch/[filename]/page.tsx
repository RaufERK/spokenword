// app/watch/[filename]/page.tsx
import { notFound } from 'next/navigation'
import fs from 'node:fs'
import path from 'node:path'
import { ARCHIVE_DIR } from '@/data'

export const dynamic = 'force-dynamic' // всегда SSR (иначе Next
// попытался бы застатикить)

type Params = { filename: string } // ← наши реальные параметры

export default async function WatchPage(
  { params }: { params: Promise<Params> } // <- именно Promise<Params>
) {
  /* 1. Получаем filename */
  const { filename } = await params // ← поэтому компонент async
  const safe = path.basename(filename) // защита от "../"
  const full = path.join(ARCHIVE_DIR, safe)

  /* 2. Валидируем (в dev можно пропустить) */
  if (
    process.env.NODE_ENV === 'production' &&
    (!safe.endsWith('.mp4') || !fs.existsSync(full))
  ) {
    notFound()
  }

  /* 3. Рендерим видео */
  return (
    <main className='flex flex-col items-center gap-6 p-4'>
      <video
        src={`/archive/${encodeURIComponent(safe)}`}
        className='w-full max-w-3xl aspect-video rounded-xl shadow'
        controls
        preload='auto'
      />
    </main>
  )
}
