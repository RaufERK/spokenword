'use client'

import { useEffect, useState } from 'react'
import AudioHlsPlayer from '@/components/AudioHlsPlayer'

export default function AudioPage() {
  const [streamUrl, setStreamUrl] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/stream-status?key=main`)
        const data = await res.json()
        setStreamUrl(
          data.isLive ? `https://spoken-word.ru/audio/main/index.m3u8` : ''
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
    <div className='min-h-screen'>
      <div className='container mx-auto px-4 py-10 max-w-2xl'>
        <h1 className='text-2xl font-semibold text-white mb-6'>
          Аудио трансляция
        </h1>
        <AudioHlsPlayer streamUrl={streamUrl} />
        {!streamUrl && (
          <p className='text-gray-400 mt-4'>
            Эфир пока не начался. Обновляется автоматически.
          </p>
        )}
      </div>
    </div>
  )
}
