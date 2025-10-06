'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

interface AudioHlsPlayerProps {
  streamUrl: string
  className?: string
}

export default function AudioHlsPlayer({
  streamUrl,
  className = '',
}: AudioHlsPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const retryCountRef = useRef<number>(0)

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

    const loadStream = async () => {
      try {
        setIsLoading(true)
        setError(null)

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
            maxBufferLength: 20,
            maxMaxBufferLength: 40,
            backBufferLength: 10,
            liveSyncDuration: 3,
            liveMaxLatencyDuration: 10,
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
          hls.attachMedia(audio)

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('✅ AUDIO: готов, levels:', data.levels.length)
            setIsLoading(false)
            retryCountRef.current = 0
            ;(async () => {
              try {
                await audio.play()
              } catch (err) {
                console.error('❌ AUDIO: autoplay blocked')
              }
            })()
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error(`❌ AUDIO FATAL: ${data.type} - ${data.details}`)
            }
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError('Ошибка сети при загрузке аудио')
                  if (retryCountRef.current < 5) {
                    retryCountRef.current += 1
                    setTimeout(() => {
                      try {
                        hls?.destroy()
                      } catch {}
                      loadStream()
                    }, 1000 * retryCountRef.current)
                  }
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError('Ошибка воспроизведения аудио')
                  if (retryCountRef.current < 3) {
                    retryCountRef.current += 1
                    setTimeout(() => {
                      try {
                        hls?.recoverMediaError()
                      } catch {
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
          console.log('▶️ AUDIO: playing')
          setIsLoading(false)
          setIsPlaying(true)
        })

        audio.addEventListener('error', (e) => {
          console.error(`❌ AUDIO: error code ${audio.error?.code}`)
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
  }, [streamUrl])

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
              <div className='w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center'>
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
