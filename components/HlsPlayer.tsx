'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

// Declare HLS.js types for window object
declare global {
  interface Window {
    Hls?: typeof Hls
  }
}

interface HlsPlayerProps {
  streamUrl: string
  className?: string
  streamInfo?: any
}

export default function HlsPlayer({
  streamUrl,
  className = '',
  streamInfo,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const retryCountRef = useRef<number>(0)
  const isYoungStreamRef = useRef<boolean>(false)

  const withCacheBuster = (url: string) => {
    const ts = Date.now()
    return url ? `${url}${url.includes('?') ? '&' : '?'}cb=${ts}` : url
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    let hls: Hls | null = null

    // Определяем является ли стрим "молодым" (первые 30 секунд)
    isYoungStreamRef.current =
      streamInfo?.isWarmingUp || streamInfo?.streamAge < 30

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🎬 Loading stream:', {
          streamUrl,
          isYoungStream: isYoungStreamRef.current,
          streamAge: streamInfo?.streamAge,
          segmentCount: streamInfo?.segmentCount,
        })

        // Проверяем поддержку HLS в браузере
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Нативный HLS (Safari, Safari на iOS)
          video.src = withCacheBuster(streamUrl)
          video.load()
          ;(async () => {
            try {
              await video.play()
            } catch {}
          })()
        } else if (Hls.isSupported()) {
          // HLS.js для других браузеров (включая мобильные)
          hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            // Adaptive bitrate - начинаем с низкого качества для быстрого старта
            startLevel: 0, // Начинаем с 240p для быстрого старта
            capLevelToPlayerSize: false, // Разрешаем адаптивный выбор
            // Буфер для стабильности на мобильных
            maxBufferLength: 20,
            maxMaxBufferLength: 40,
            backBufferLength: 10,
            // Настройки Live-режима
            liveSyncDuration: 3,
            liveMaxLatencyDuration: 10,
            maxLiveSyncPlaybackRate: 1.5,
            startPosition: -1,
            // Агрессивное переключение качества для мобильных
            abrEwmaDefaultEstimate: 500000, // Начинаем с консервативной оценки
            abrBandWidthFactor: 0.95, // Запас 5% для стабильности
            abrBandWidthUpFactor: 0.7, // Медленно повышаем качество
            // Таймауты для надежности
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 5,
            manifestLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 15000,
            levelLoadingMaxRetry: 5,
            levelLoadingRetryDelay: 1000,
            fragLoadingTimeOut: 25000,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 1000,
          })

          hls.loadSource(withCacheBuster(streamUrl))
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed, starting playback')
            setIsLoading(false)
            retryCountRef.current = 0
            ;(async () => {
              try {
                await video.play()
              } catch {}
            })()
          })

          hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
            if (data.details?.live) {
              // При необходимости дополнительно поджимаем к краю онлайн
              const liveEdgeSec =
                (data.details.edge ?? 0) - (data.details.totalduration ?? 0) + 3
              if (!Number.isNaN(liveEdgeSec) && video.readyState >= 1) {
                // Без агрессивных seek'ов: hls уже использует startPosition=-3
              }
            }
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS error:', data)
            if (data.fatal) {
              const isYoungStream = isYoungStreamRef.current
              const maxRetries = isYoungStream ? 8 : 3
              const retryDelay = isYoungStream
                ? 1500
                : 1000 * retryCountRef.current

              console.log('🔄 Error handling:', {
                errorType: data.type,
                isYoungStream,
                retryCount: retryCountRef.current,
                maxRetries,
                retryDelay,
              })

              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError(
                    isYoungStream
                      ? 'Подключение к стриму...'
                      : 'Ошибка сети при загрузке потока'
                  )
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError(
                    isYoungStream
                      ? 'Буферизация...'
                      : 'Ошибка воспроизведения медиа'
                  )
                  break
                default:
                  setError('Ошибка воспроизведения потока')
                  break
              }
              setIsLoading(false)

              // Усиленный авто-ретрай для молодых стримов
              if (retryCountRef.current < maxRetries) {
                retryCountRef.current += 1
                setTimeout(() => {
                  console.log(
                    `🔄 Retry attempt ${retryCountRef.current}/${maxRetries}`
                  )
                  try {
                    hls?.destroy()
                  } catch {}
                  // Перезапуск загрузки с новым cb
                  setError(null)
                  loadStream()
                }, retryDelay)
              } else {
                console.log('❌ Max retries reached')
              }
            }
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
      retryCountRef.current = 0
      if (hls) {
        try {
          hls.destroy()
        } catch {}
      }
      if (video) {
        video.src = ''
      }
    }
  }, [streamUrl, streamInfo?.streamAge])

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
        preload='metadata'
        webkit-playsinline='true'
        x-webkit-airplay='allow'
        className='w-full h-full'
        style={{ aspectRatio: '16/9' }}
      >
        Ваш браузер не поддерживает воспроизведение видео.
      </video>
    </div>
  )
}
