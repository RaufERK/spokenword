// app/page.tsx
import HlsPlayer from '@/components/HlsPlayer' // путь зависит от проекта

export default function HomePage() {
  return (
    <main className='flex flex-col items-center gap-6 p-4'>
      <HlsPlayer
        src='/live/playlist.m3u8'
        className='w-full max-w-3xl aspect-video rounded-lg shadow'
      />
      {/* остальной контент без изменений */}
    </main>
  )
}
