// app/page.tsx
import HlsPlayer from '@/components/HlsPlayer'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className='flex flex-col items-center gap-6 p-4'>
      <HlsPlayer
        src='/live/playlist.m3u8'
        className='w-full max-w-3xl aspect-video rounded-xl shadow'
       
      />
      <div className='text-center text-lg'>
        <p>Если сейчас идёт трансляция, она начнётся автоматически.</p>
        <p className='italic text-sm text-gray-600'>
          При отсутствии стрима появится сообщение «Трансляция не ведётся».
        </p>
      </div>
      <Link
        href='/archive'
        className='underline text-blue-600 hover:text-blue-800'
      >
        Перейти в архив записей
      </Link>
    </main>
  )
}
