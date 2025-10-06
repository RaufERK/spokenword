'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

declare global {
  interface Window {
    Hls?: typeof Hls
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
  const retryCountRef = useRef<number>(0)

  const withCacheBuster = (url: string) => {
    const ts = Date.now()
    return url ? `${url}${url.includes('?') ? '&' : '?'}cb=${ts}` : url
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) {
      setIsLoading(false)
      return
    }

    let hls: Hls | null = null

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = withCacheBuster(streamUrl)
          video.load()
          ;(async () => {
            try {
              await video.play()
            } catch {}
          })()
        } else if (Hls.isSupported()) {
          hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            backBufferLength: 10,
            liveSyncDuration: 5,
            liveMaxLatencyDuration: 15,
            maxLiveSyncPlaybackRate: 1.5,
            startPosition: -1,
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
            setIsLoading(false)
            retryCountRef.current = 0
            ;(async () => {
              try {
                await video.play()
                console.log('▶️ VIDEO')
              } catch {}
            })()
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error(`❌ VIDEO: ${data.details}`)
            }
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError('Ошибка сети при загрузке потока')
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError('Ошибка воспроизведения медиа')
                  break
                default:
                  setError('Ошибка воспроизведения потока')
                  break
              }
              setIsLoading(false)

              if (retryCountRef.current < 3) {
                retryCountRef.current += 1
                setTimeout(() => {
                  try {
                    hls?.destroy()
                  } catch {}
                  loadStream()
                }, 1000 * retryCountRef.current)
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

        video.addEventListener('playing', () => {
          console.log('▶️ VIDEO: playing')
        })

        video.addEventListener('error', () => {
          console.error(`❌ VIDEO element error:`, {
            code: video.error?.code,
            message: video.error?.message,
            src: video.src,
            readyState: video.readyState,
            networkState: video.networkState,
          })
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
        video.pause()
        video.removeAttribute('src')
        video.load()
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
