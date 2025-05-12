'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export interface HlsPlayerProps {
  src: string
  className?: string
}

export default function HlsPlayer({ src, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [available, setAvailable] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Проверка доступности плейлиста
    fetch(src, { method: 'HEAD' })
      .then((res) =>
        setAvailable(res.ok && Number(res.headers.get('content-length')) > 0)
      )
      .catch(() => setAvailable(false))

    // Настройка HLS
    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = false
        video.volume = 1
        video
          .play()
          .catch((err) => console.warn('Autoplay failed:', err.message))
      })

      return () => hls.destroy()
    } else {
      video.src = src
      video.muted = false
      video.volume = 1
      video
        .play()
        .catch((err) => console.warn('Autoplay failed (native):', err.message))
    }
  }, [src])

  if (!available) {
    return <p className="text-center text-xl">Трансляция не ведётся</p>
  }

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      playsInline
      autoPlay // всё ещё нужно
    />
  )
}
