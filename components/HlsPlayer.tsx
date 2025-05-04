// ---------- components/Player.tsx (HLS auto‑play) ----------
import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface PlayerProps {
  src: string
}

export default function Player({ src }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true })
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => hls.destroy()
    } else {
      // iOS Safari
      video.src = src
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      className='w-full aspect-video bg-black'
      autoPlay
      controls
      muted
      playsInline
    />
  )
}
