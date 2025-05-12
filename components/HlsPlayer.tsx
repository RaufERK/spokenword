'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export interface HlsPlayerProps {
  /** HLS playlist URL */
  src: string
  /** Optional CSS class names for the <video> element */
  className?: string
}

export default function HlsPlayer({ src, className }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [available, setAvailable] = useState(true)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // HEAD-request to verify playlist
    fetch(src, { method: 'HEAD' })
      .then((res) =>
        setAvailable(res.ok && Number(res.headers.get('content-length')) > 0)
      )
      .catch(() => setAvailable(false))

    // Подключаем HLS
    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => {
        hls.destroy()
      }
    } else {
      // native HLS
      video.src = src
    }
  }, [src])

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

  if (!available) {
    return <p className='text-center text-xl'>Трансляция не ведётся</p>
  }

  return (
    <div className='relative'>
      <video
        ref={videoRef}
        className={className}
        controls
        autoPlay
        muted={muted}
        playsInline
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
