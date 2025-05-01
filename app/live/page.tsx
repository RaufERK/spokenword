// app/live/page.tsx

'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import Link from 'next/link'

export default function LivePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isStreaming, setIsStreaming] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource('/live/stream.m3u8')
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, () => {
        setIsStreaming(false)
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = '/live/stream.m3u8'
      video.addEventListener('error', () => setIsStreaming(false))
    } else {
      setIsStreaming(false)
    }
  }, [])

  return (
    <div className='p-4'>
      <h1 className='text-2xl mb-4 text-center'>Прямая трансляция</h1>

      {isStreaming ? (
        <video
          ref={videoRef}
          controls
          autoPlay
          className='w-full max-w-3xl mx-auto'
        />
      ) : (
        <p className='text-center text-gray-500 mb-4'>
          Трансляция пока не началась
        </p>
      )}

      <div className='mt-6 text-center'>
        <Link
          href='/archive'
          className='inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
        >
          Перейти в архив записей
        </Link>
      </div>
    </div>
  )
}
