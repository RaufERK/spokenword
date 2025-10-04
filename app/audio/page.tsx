'use client'

import { useEffect, useState, useRef } from 'react'
import AudioHlsPlayer from '@/components/AudioHlsPlayer'

export default function AudioPage() {
  const [streamUrl, setStreamUrl] = useState('')
  const [isWarmingUp, setIsWarmingUp] = useState(false)
  const [streamInfo, setStreamInfo] = useState<any>(null)
  const wasOfflineRef = useRef<boolean>(true)
  const warmupTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/stream-status?key=main`)
        const data = await res.json()

        console.log('Audio stream status:', data)
        setStreamInfo(data)

        const currentlyLive = Boolean(data.isLive)
        const justStarted = wasOfflineRef.current && currentlyLive

        if (justStarted) {
          console.log(
            '🎧 Audio stream just started! Entering warm-up period...'
          )
          setIsWarmingUp(true)
          setStreamUrl('')

          if (warmupTimerRef.current) {
            clearTimeout(warmupTimerRef.current)
          }

          // Аудио стабилизируется быстрее - 5 секунд достаточно
          warmupTimerRef.current = setTimeout(() => {
            console.log('✅ Audio warm-up complete')
            setIsWarmingUp(false)
            setStreamUrl(`https://spoken-word.ru/hls/live/main.m3u8`)
          }, 5000)
        } else if (currentlyLive && !justStarted) {
          setIsWarmingUp(false)
          setStreamUrl(`https://spoken-word.ru/hls/live/main.m3u8`)
        } else {
          setIsWarmingUp(false)
          setStreamUrl('')
        }

        wasOfflineRef.current = !currentlyLive
      } catch {
        setStreamUrl('')
      }
    }
    load()
    const id = setInterval(load, 10000)
    return () => {
      clearInterval(id)
      if (warmupTimerRef.current) {
        clearTimeout(warmupTimerRef.current)
      }
    }
  }, [])

  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-950 to-gray-900'>
      <div className='container mx-auto px-4 py-10 max-w-3xl'>
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-white mb-2'>
            🎧 Аудио трансляция
          </h1>
          <p className='text-gray-400'>
            Слушайте прямой эфир в удобном формате
          </p>
        </div>

        {streamUrl ? (
          <AudioHlsPlayer streamUrl={streamUrl} streamInfo={streamInfo} />
        ) : isWarmingUp ? (
          <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-8 text-center border border-blue-800'>
            <div className='mb-6'>
              <div className='w-16 h-16 mx-auto relative'>
                <div className='absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin'></div>
                <div
                  className='absolute inset-2 rounded-full border-4 border-green-500 border-t-transparent animate-spin'
                  style={{
                    animationDirection: 'reverse',
                    animationDuration: '1s',
                  }}
                ></div>
              </div>
            </div>
            <h3 className='text-xl font-bold text-blue-400 mb-2 animate-pulse'>
              🎧 Аудио запускается...
            </h3>
            <p className='text-gray-300 mb-2'>Подготовка аудио потока</p>
            <p className='text-sm text-gray-500'>
              Ожидание стабилизации (~5 секунд)
            </p>
            {streamInfo && (
              <div className='mt-4 text-xs text-gray-600'>
                Сегментов: {streamInfo.segmentCount || 0}
              </div>
            )}
          </div>
        ) : (
          <div className='bg-gray-900 rounded-lg p-8 text-center border border-gray-800'>
            <div className='text-gray-400 mb-4'>
              <svg
                className='w-16 h-16 mx-auto mb-4 opacity-50'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
                />
              </svg>
              <h3 className='text-xl font-semibold text-gray-300 mb-2'>
                Эфир пока не начался
              </h3>
              <p className='text-gray-500'>
                Как только начнётся трансляция, аудио появится автоматически
              </p>
            </div>
            <div className='mt-4 text-xs text-gray-600'>
              Обновление каждые 10 секунд
            </div>
          </div>
        )}

        <div className='mt-8 text-center text-sm text-gray-500'>
          <p>💡 Совет: Используйте наушники для лучшего качества звука</p>
        </div>
      </div>
    </div>
  )
}
