'use client'

import { useEffect, useState } from 'react'
import HlsPlayer from '@/components/HlsPlayer'

export default function LivePage() {
  const [streamUrl, setStreamUrl] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/stream-status?key=main`)
        const data = await res.json()
        setStreamUrl(
          data.isLive ? `https://spoken-word.ru/live/main/index.m3u8` : ''
        )
      } catch {
        setStreamUrl('')
      }
    }

    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className='min-h-screen bg-black'>
      <HlsPlayer streamUrl={streamUrl} className='w-full max-w-none' />
    </div>
  )
}
