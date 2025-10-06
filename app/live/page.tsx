'use client'

import { useEffect, useState } from 'react'
import HlsPlayer from '@/components/HlsPlayer'

export default function LivePage() {
  const [streamUrl, setStreamUrl] = useState<string>('')
  const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/stream-status?key=main`)
        const data = await res.json()

        if (data.isLive && data.isWarmingUp) {
          setIsWarmingUp(true)
          setStreamUrl('')
        } else if (data.isLive && !data.isWarmingUp) {
          setIsWarmingUp(false)
          setStreamUrl(`https://spoken-word.ru/hls/live/main.m3u8`)
        } else {
          setIsWarmingUp(false)
          setStreamUrl('')
        }
      } catch {
        setIsWarmingUp(false)
        setStreamUrl('')
      }
    }

    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className='min-h-screen'>
      {streamUrl ? (
        <HlsPlayer streamUrl={streamUrl} className='w-full max-w-none' />
      ) : isWarmingUp ? (
        <div className='w-full aspect-video flex items-center justify-center bg-gray-900'>
          <div className='text-center px-6'>
            <div className='relative'>
              <div className='w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
              <svg
                className='w-8 h-8 absolute top-4 left-1/2 transform -translate-x-1/2 text-blue-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                />
              </svg>
            </div>
            <h3 className='text-xl font-semibold text-blue-400 mb-2'>
              Стрим запускается...
            </h3>
            <p className='text-gray-400'>
              Накапливаем буфер для стабильного воспроизведения
            </p>
            <p className='text-gray-500 text-sm mt-2'>
              Ещё несколько секунд...
            </p>
          </div>
        </div>
      ) : (
        <div className='w-full aspect-video flex items-center justify-center bg-gray-900'>
          <div className='text-center px-6'>
            <svg
              className='w-16 h-16 mx-auto mb-4 text-gray-400'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
              />
            </svg>
            <h3 className='text-xl font-semibold text-gray-200 mb-2'>
              Сейчас трансляция не ведётся
            </h3>
            <p className='text-gray-400'>
              Как только эфир начнётся, видео появится автоматически
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
