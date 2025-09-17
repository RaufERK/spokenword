// app/page.tsx

import HlsPlayer from '@/components/HlsPlayer'
import StreamLinkBlock from '@/components/StreamLinkBlock'

export default function HomePage() {
  return (
    <main className='flex flex-col items-center gap-6 p-4'>
      <StreamLinkBlock />
      <HlsPlayer
        streamUrl='/live/playlist.m3u8'
        className='w-full max-w-3xl aspect-video rounded-lg shadow'
      />
    </main>
  )
}
