'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface StreamInfo {
  isLive?: boolean
  isWarmingUp?: boolean
  streamAge?: number
  segmentCount?: number
  tsFilesOnDisk?: number
}

interface AudioHlsPlayerProps {
  streamUrl: string
  className?: string
  streamInfo?: StreamInfo
}

export default function AudioHlsPlayer({
  streamUrl,
  className = '',
  streamInfo,
}: AudioHlsPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const retryCountRef = useRef<number>(0)
  const isYoungStreamRef = useRef<boolean>(false)

  const withCacheBuster = (url: string) => {
    const ts = Date.now()
    const random = Math.random()
      .toString(36)
      .substring(7)
    return url
      ? `${url}${url.includes('?') ? '&' : '?'}cb=${ts}-${random}`
      : url
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !streamUrl) {
      setIsLoading(false)
      return
    }

    let hls: Hls | null = null

    // Определяем является ли стрим "молодым"
    isYoungStreamRef.current =
      streamInfo?.isWarmingUp ||
      (streamInfo?.streamAge !== undefined && streamInfo.streamAge < 30)

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🎧 Loading audio stream:', {
          streamUrl,
          isYoungStream: isYoungStreamRef.current,
          streamAge: streamInfo?.streamAge,
          segmentCount: streamInfo?.segmentCount,
        })

        if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = withCacheBuster(streamUrl)
          audio.load()
          ;(async () => {
            try {
              await audio.play()
            } catch {}
          })()
        } else if (Hls.isSupported()) {
          hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 15,
            maxMaxBufferLength: 30,
            backBufferLength: 5,
            liveSyncDuration: 2,
            liveMaxLatencyDuration: 8,
            startPosition: -1,
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 10,
            manifestLoadingRetryDelay: 500,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 10,
            levelLoadingRetryDelay: 500,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 8,
            fragLoadingRetryDelay: 500,
          })

          hls.loadSource(withCacheBuster(streamUrl))
          hls.attachMedia(audio)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS audio manifest parsed')
            setIsLoading(false)
            retryCountRef.current = 0
            ;(async () => {
              try {
                await audio.play()
              } catch {
                console.log('Auto-play prevented, user interaction needed')
              }
            })()
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS audio error:', data)
            if (data.fatal) {
              const isYoungStream = isYoungStreamRef.current
              const maxRetries = isYoungStream ? 10 : 5
              const retryDelay = isYoungStream
                ? 1200
                : 1000 * retryCountRef.current

              console.log('🔄 Audio error handling:', {
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
                      ? 'Подключение к аудио стриму...'
                      : 'Ошибка сети при загрузке аудио'
                  )
                  if (retryCountRef.current < maxRetries) {
                    retryCountRef.current += 1
                    setTimeout(() => {
                      console.log(
                        `🔄 Audio retry ${retryCountRef.current}/${maxRetries}`
                      )
                      try {
                        hls?.destroy()
                      } catch {}
                      setError(null)
                      loadStream()
                    }, retryDelay)
                  } else {
                    console.log('❌ Audio max retries reached')
                  }
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError(
                    isYoungStream
                      ? 'Буферизация аудио...'
                      : 'Ошибка воспроизведения аудио'
                  )
                  if (retryCountRef.current < maxRetries) {
                    retryCountRef.current += 1
                    setTimeout(() => {
                      try {
                        hls?.recoverMediaError()
                      } catch {
                        setError(null)
                        loadStream()
                      }
                    }, 500)
                  }
                  break
                default:
                  setError('Ошибка воспроизведения потока')
                  break
              }
              setIsLoading(false)
            }
          })
        } else {
          setError('HLS не поддерживается в вашем браузере')
          setIsLoading(false)
          return
        }

        audio.addEventListener('loadeddata', () => {
          setIsLoading(false)
        })

        audio.addEventListener('play', () => {
          setIsPlaying(true)
          setError(null)
        })

        audio.addEventListener('pause', () => {
          setIsPlaying(false)
        })

        audio.addEventListener('waiting', () => {
          setIsLoading(true)
        })

        audio.addEventListener('playing', () => {
          setIsLoading(false)
          setIsPlaying(true)
        })

        audio.addEventListener('error', () => {
          setError('Ошибка загрузки аудио')
          setIsLoading(false)
        })
      } catch (err) {
        console.error('Audio stream loading error:', err)
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
      if (audio) {
        audio.pause()
        audio.src = ''
      }
    }
  }, [streamUrl, streamInfo])

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className='text-center'>
          <div className='text-red-400 mb-3'>
            <svg
              className='w-12 h-12 mx-auto mb-3'
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
            <p className='text-base font-semibold'>{error}</p>
          </div>
          <p className='text-gray-400 text-sm'>Попробуйте обновить страницу</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 shadow-xl border border-gray-700'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center space-x-3'>
            {isPlaying ? (
              <div className='relative'>
                <div className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse'>
                  <svg
                    className='w-6 h-6 text-white'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M8 5v14l11-7z' />
                  </svg>
                </div>
                <div className='absolute inset-0 w-12 h-12 bg-green-500 rounded-full animate-ping opacity-20'></div>
              </div>
            ) : (
              <div className='w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-gray-400'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M8 5v14l11-7z' />
                </svg>
              </div>
            )}
            <div>
              <h3 className='text-lg font-semibold text-white'>
                Аудио трансляция
              </h3>
              <p className='text-sm text-gray-400'>
                {isPlaying
                  ? '🎙️ В эфире'
                  : isLoading
                  ? 'Загрузка...'
                  : 'Остановлено'}
              </p>
            </div>
          </div>
          {isPlaying && (
            <div className='flex space-x-1'>
              <div
                className='w-1 h-8 bg-green-400 rounded-full animate-pulse'
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className='w-1 h-6 bg-green-400 rounded-full animate-pulse'
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className='w-1 h-10 bg-green-400 rounded-full animate-pulse'
                style={{ animationDelay: '300ms' }}
              ></div>
              <div
                className='w-1 h-7 bg-green-400 rounded-full animate-pulse'
                style={{ animationDelay: '450ms' }}
              ></div>
            </div>
          )}
        </div>

        <audio
          ref={audioRef}
          controls
          playsInline
          preload='none'
          className='w-full'
        >
          Ваш браузер не поддерживает аудио.
        </audio>

        {isPlaying && (
          <div className='mt-3 text-center'>
            <p className='text-xs text-green-400'>
              ✅ Прямой эфир • Задержка ~3-5 секунд
            </p>
          </div>
        )}

        {isLoading && !error && (
          <div className='mt-3 text-center'>
            <div className='inline-flex items-center space-x-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400'></div>
              <p className='text-sm text-blue-400'>Буферизация потока...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
