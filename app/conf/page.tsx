// app/conf/page.tsx

import Announcement from '@/components/Announcement'

// import HlsPlayer from '@/components/HlsPlayer'

export default function ConfPage() {
  return (
    <main className='flex flex-col items-center gap-6 p-4'>
      <Announcement />
      {/*    <HlsPlayer
         src='/conf/playlist.m3u8'
         className='w-full max-w-4xl aspect-video rounded-lg shadow-lg'
       /> */}
    </main>
  )
}
