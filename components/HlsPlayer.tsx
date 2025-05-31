'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export interface HlsPlayerProps {
  /** URL мастер‑плейлиста */
  src: string
  /** Дополнительные классы для <video> */
  className?: string
}

/**
 * HLS‑плеер с polling‑HEAD (каждые 3 с) и фоном цвета indigo‑900 вокруг кадра.
 */
export default function HlsPlayerPolling({ src, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [available, setAvailable] = useState(false)
  const [muted, setMuted] = useState(true)

  /* Проверяем наличие плейлиста */
  useEffect(() => {
    const probe = () => {
      fetch(src, { method: 'HEAD', cache: 'no-store' })
        .then((r) =>
          setAvailable(r.ok && Number(r.headers.get('content-length')) > 0)
        )
        .catch(() => setAvailable(false))
    }

    probe()
    const timer = setInterval(probe, 3000)
    return () => clearInterval(timer)
  }, [src])

  /* Подключаем Hls.js, когда эфир найден */
  useEffect(() => {
    if (!available) return
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
        }
      })

      return () => hls.destroy()
    } else {
      video.src = src
    }
  }, [available, src])

  const handleUnmute = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      video.muted = false
      video.volume = 1
      await video.play()
      setMuted(false)
    } catch (e) {
      console.warn('Не удалось включить звук:', e)
    }
  }

  /* Пока эфира нет — выводим сообщение */
  if (!available) {
    return (
      <p className='text-center text-xl text-white bg-indigo-950 p-4 rounded-xl'>
        Трансляция не ведётся
      </p>
    )
  }

  return (
    <div className='relative bg-indigo-950 p-2 rounded-xl'>
      <video
        ref={videoRef}
        className={`${className ?? ''} w-full h-full`} /* передаём пользовательские классы */
        controls
        autoPlay
        muted
        playsInline
        preload='none'
      />
      {muted && (
        <button
          onClick={handleUnmute}
          className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg hover:bg-green-700 transition'
        >
          Включить звук
        </button>
      )}
    </div>
  )
}
