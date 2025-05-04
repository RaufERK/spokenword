// components/HlsPlayer.tsx
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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // HEAD-request to verify playlist
    fetch(src, { method: 'HEAD' })
      .then((res) =>
        setAvailable(res.ok && Number(res.headers.get('content-length')) > 0)
      )
      .catch(() => setAvailable(false))

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => { hls.destroy() }
    } else {
      // native HLS on Safari
      video.src = src
    }
  }, [src])

  if (!available) {
    return (
      <p className='text-center text-xl'>
        Трансляция не ведётся
      </p>
    )
  }

  return (
    <video
      ref={videoRef}
      className={className}
      controls
      autoPlay
      muted
      playsInline
    />
  )
}
