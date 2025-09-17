'use client'

import { useState, useEffect } from 'react'
import HlsPlayer from '@/components/HlsPlayer'
import StreamLinkBlock from '@/components/StreamLinkBlock'

export default function HomePage() {
  const [streamKey] = useState<string>('main')
  const [streamUrl, setStreamUrl] = useState<string>('')
  const [isLive, setIsLive] = useState<boolean>(false)

  useEffect(() => {
    // Проверяем доступность стрима
    const checkStream = async () => {
      try {
        const response = await fetch(`/api/stream-status?key=${streamKey}`)
        const data = await response.json()
        setIsLive(data.isLive)

        if (data.isLive) {
          setStreamUrl(`https://spoken-word.ru/live/${streamKey}/index.m3u8`)
        } else {
          setStreamUrl('')
        }
      } catch (error) {
        console.error('Error checking stream status:', error)
        setIsLive(false)
        setStreamUrl('')
      }
    }

    checkStream()

    // Проверяем каждые 10 секунд
    const interval = setInterval(checkStream, 10000)

    return () => clearInterval(interval)
  }, [streamKey])

  return (
    <main className='flex flex-col items-center gap-6 p-4'>
      <StreamLinkBlock />

      {isLive ? (
        <div className='w-full max-w-3xl'>
          <div className='flex items-center mb-4'>
            <div className='flex items-center'>
              <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2'></div>
              <span className='text-lg font-semibold text-gray-900'>
                В эфире
              </span>
            </div>
          </div>
          <HlsPlayer
            streamUrl={streamUrl}
            className='w-full aspect-video rounded-lg shadow'
          />
        </div>
      ) : (
        <div className='w-full max-w-3xl bg-gray-900 rounded-lg p-12 text-center'>
          <div className='text-gray-400 mb-4'>
            <svg
              className='w-20 h-20 mx-auto mb-4'
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
            <h3 className='text-xl font-semibold mb-2'>
              Трансляция не ведется
            </h3>
            <p className='text-gray-500'>
              В данный момент нет активной трансляции. Следите за расписанием
              мероприятий.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
