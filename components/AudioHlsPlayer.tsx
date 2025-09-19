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
  const retryCountRef = useRef(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !streamUrl) return

    let hls: Hls | null = null

    const withCb = (url: string) =>
      `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (
          typeof audio.canPlayType === 'function' &&
          audio.canPlayType('application/vnd.apple.mpegurl')
        ) {
          audio.src = withCb(streamUrl)
          audio.load()
        } else if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            backBufferLength: 90,
          })
          hls.loadSource(withCb(streamUrl))
          hls.attachMedia(audio)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false)
            retryCountRef.current = 0
          })
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) {
              // Не показываем ошибку пользователю, пробуем мягкий ретрай
              setIsLoading(true)
              if (retryCountRef.current < 5) {
                retryCountRef.current += 1
                setTimeout(() => {
                  try {
                    hls?.destroy()
                  } catch {}
                  load()
                }, 800 * retryCountRef.current)
              } else {
                setError('Ошибка загрузки аудио')
                setIsLoading(false)
              }
            }
          })
        } else {
          setError('Ваш браузер не поддерживает HLS')
          setIsLoading(false)
        }

        audio.addEventListener('loadeddata', () => setIsLoading(false))
        audio.addEventListener('error', () => {
          setError('Ошибка аудио')
          setIsLoading(false)
        })
      } catch {
        setError('Ошибка аудио')
        setIsLoading(false)
      }
    }

    load()

    return () => {
      retryCountRef.current = 0
      if (hls) {
        try {
          hls.destroy()
        } catch {}
      }
      if (audio) audio.src = ''
    }
  }, [streamUrl])

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-900'>
          <div className='text-center text-gray-300'>Загрузка аудио…</div>
        </div>
      )}
      {error ? (
        <div className='bg-gray-900 text-red-400 p-6 rounded-lg text-center'>
          {error}
        </div>
      ) : (
        <audio ref={audioRef} controls playsInline className='w-full'>
          Ваш браузер не поддерживает аудио.
        </audio>
      )}
    </div>
  )
}
