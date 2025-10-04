'use client'

import { useEffect, useState, useRef } from 'react'
import HlsPlayer from '@/components/HlsPlayer'

export default function LivePage() {
  const [streamUrl, setStreamUrl] = useState<string>('')
  const [isLive, setIsLive] = useState<boolean>(false)
  const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false)
  const [streamInfo, setStreamInfo] = useState<any>(null)
  const wasOfflineRef = useRef<boolean>(true)
  const warmupTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/stream-status?key=main`)
        const data = await res.json()

        console.log('Stream status:', data)
        setStreamInfo(data)

        const currentlyLive = Boolean(data.isLive)
        const justStarted = wasOfflineRef.current && currentlyLive

        if (justStarted) {
          console.log('🎬 Stream just started! Entering warm-up period...')
          setIsWarmingUp(true)
          setIsLive(false)

          // Очищаем предыдущий таймер если есть
          if (warmupTimerRef.current) {
            clearTimeout(warmupTimerRef.current)
          }

          // Даем стриму 6 секунд на стабилизацию (3 сегмента по 2 сек)
          warmupTimerRef.current = setTimeout(() => {
            console.log('✅ Warm-up complete, loading player...')
            setIsWarmingUp(false)
            setIsLive(true)
            setStreamUrl(`https://spoken-word.ru/hls/live/main.m3u8`)
          }, 6000)
        } else if (currentlyLive && !justStarted) {
          // Стрим уже работает
          setIsLive(true)
          setIsWarmingUp(false)
          setStreamUrl(`https://spoken-word.ru/hls/live/main.m3u8`)
        } else {
          // Стрим остановлен
          setIsLive(false)
          setIsWarmingUp(false)
          setStreamUrl('')
        }

        wasOfflineRef.current = !currentlyLive
      } catch {
        setIsLive(false)
        setIsWarmingUp(false)
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
    <div className='min-h-screen'>
      {isLive ? (
        <HlsPlayer
          streamUrl={streamUrl}
          className='w-full max-w-none'
          streamInfo={streamInfo}
        />
      ) : isWarmingUp ? (
        <div className='w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'>
          <div className='text-center px-6'>
            <div className='relative mb-6'>
              <div className='w-20 h-20 mx-auto'>
                <div className='absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin'></div>
                <div
                  className='absolute inset-2 rounded-full border-4 border-purple-500 border-t-transparent animate-spin'
                  style={{
                    animationDirection: 'reverse',
                    animationDuration: '1s',
                  }}
                ></div>
              </div>
            </div>
            <h3 className='text-2xl font-bold text-blue-400 mb-3 animate-pulse'>
              🎬 Стрим запускается...
            </h3>
            <p className='text-gray-300 mb-2'>
              Подготовка видео потока к показу
            </p>
            <p className='text-sm text-gray-500'>
              Ожидание накопления сегментов (~6 секунд)
            </p>
            {streamInfo && (
              <div className='mt-4 text-xs text-gray-600'>
                Сегментов: {streamInfo.segmentCount || 0} | Файлов:{' '}
                {streamInfo.tsFilesOnDisk || 0}
              </div>
            )}
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
