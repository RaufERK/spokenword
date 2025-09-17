'use client'

import { useEffect, useRef, useState } from 'react'

// Declare HLS.js types for window object
declare global {
  interface Window {
    Hls?: {
      new (): {
        loadSource: (url: string) => void
        attachMedia: (element: HTMLVideoElement) => void
        on: (
          event: string,
          callback: (event: string, data: { details: string }) => void
        ) => void
      }
    }
  }
}

interface HlsPlayerProps {
  streamUrl: string
  className?: string
}

export default function HlsPlayer({
  streamUrl,
  className = '',
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Проверяем поддержку HLS в браузере
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Нативный HLS (Safari)
          video.src = streamUrl
        } else if (typeof window !== 'undefined' && window.Hls) {
          // HLS.js для других браузеров
          const hls = new window.Hls()
          hls.loadSource(streamUrl)
          hls.attachMedia(video)

          hls.on('error', (event: string, data: { details: string }) => {
            console.error('HLS error:', data)
            setError(`Ошибка воспроизведения: ${data.details}`)
            setIsLoading(false)
          })
        } else {
          setError('HLS не поддерживается в вашем браузере')
          setIsLoading(false)
          return
        }

        video.addEventListener('loadeddata', () => {
          setIsLoading(false)
        })

        video.addEventListener('error', () => {
          setError('Ошибка загрузки видео')
          setIsLoading(false)
        })
      } catch (err) {
        console.error('Stream loading error:', err)
        setError('Ошибка загрузки потока')
        setIsLoading(false)
      }
    }

    loadStream()

    return () => {
      if (video) {
        video.src = ''
      }
    }
  }, [streamUrl])

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-8 text-center ${className}`}>
        <div className='text-red-400 mb-4'>
          <svg
            className='w-16 h-16 mx-auto mb-4'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
          <p className='text-lg font-semibold'>{error}</p>
        </div>
        <p className='text-gray-400 text-sm'>
          Попробуйте обновить страницу или обратитесь к администратору
        </p>
      </div>
    )
  }

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
    >
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-900 z-10'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4'></div>
            <p className='text-blue-400'>Загрузка потока...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        className='w-full h-full'
        style={{ aspectRatio: '16/9' }}
      >
        Ваш браузер не поддерживает воспроизведение видео.
      </video>
    </div>
  )
}
