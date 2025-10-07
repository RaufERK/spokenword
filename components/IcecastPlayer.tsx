'use client'

import { useEffect, useRef, useState } from 'react'

interface IcecastPlayerProps {
  streamUrl: string
  className?: string
}

export default function IcecastPlayer({
  streamUrl,
  className = '',
}: IcecastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !streamUrl) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const withCb = (url: string) =>
      `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`

    audio.src = withCb(streamUrl)
    audio.load()

    const handleCanPlay = () => {
      setIsLoading(false)
      setError(null)
    }

    const handleError = () => {
      setError('Ошибка загрузки аудио')
      setIsLoading(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleWaiting = () => {
      setIsLoading(true)
    }

    const handlePlaying = () => {
      setIsLoading(false)
    }

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('playing', handlePlaying)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('playing', handlePlaying)
      audio.src = ''
    }
  }, [streamUrl])

  return (
    <div className={`relative ${className}`}>
      {isLoading && isPlaying && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg'>
          <div className='text-center text-gray-300'>Буферизация...</div>
        </div>
      )}
      {error ? (
        <div className='bg-gray-900 text-red-400 p-6 rounded-lg text-center'>
          {error}
        </div>
      ) : (
        <audio
          ref={audioRef}
          controls
          playsInline
          preload='none'
          className='w-full'
        >
          Ваш браузер не поддерживает аудио.
        </audio>
      )}
      {!error && !isLoading && (
        <p className='text-gray-400 text-sm mt-2'>
          🎙️ Прямой эфир • Задержка &lt;2 секунд
        </p>
      )}
    </div>
  )
}











