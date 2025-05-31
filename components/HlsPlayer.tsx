// components/HlsPlayerPolling.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls, { Events, ErrorTypes } from 'hls.js'

export interface HlsPlayerProps {
  /** HLS playlist URL (master or media) */
  src: string
  /** Extra classes passed to the <video> element */
  className?: string
  /** How often to probe the playlist (ms). Default = 3000 */
  pollingIntervalMs?: number
}

/**
 * Live‑стрим с HEAD‑polling + auto‑reconnect.
 * ▸ Запрашивает плейлист HEAD‑ом каждые `pollingIntervalMs` мс.
 * ▸ Как только размер > 0 — поднимает hls.js и начинает воспроизведение.
 * ▸ Фон вокруг кадра — тёмно‑индиго.
 */
export default function HlsPlayerPolling({
  src,
  className = '',
  pollingIntervalMs = 3000,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [available, setAvailable] = useState(false)
  const [muted, setMuted] = useState(true)

  /* ─── 1. HEAD‑polling ─────────────────────────────────────────────── */
  useEffect(() => {
    const probe = () => {
      // cache‑buster ➜ избегаем 304/кеша браузера/прокси
      fetch(`${src}?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      })
        .then((r) =>
          setAvailable(r.ok && Number(r.headers.get('content-length') ?? 0) > 0)
        )
        .catch(() => setAvailable(false))
    }

    probe() // первый запрос сразу
    const timer = setInterval(probe, pollingIntervalMs)
    return () => clearInterval(timer)
  }, [src, pollingIntervalMs])

  /* ─── 2. Поднимаем hls.js, когда плейлист появился ───────────────── */
  useEffect(() => {
    if (!available) return
    const video = videoRef.current
    if (!video) return

    const hls = new Hls({
      liveDurationInfinity: true,
      lowLatencyMode: true,
      backBufferLength: 30,
    })

    const attachSrc = () => {
      hls.loadSource(`${src}?t=${Date.now()}`)
      hls.attachMedia(video)
    }

    attachSrc()

    // авто‑восстановление на фатальных ошибках
    hls.on(Events.ERROR, (_e, data) => {
      if (!data.fatal) return
      switch (data.type) {
        case ErrorTypes.NETWORK_ERROR:
          hls.startLoad() // повторная загрузка
          break
        case ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError()
          break
        default:
          hls.destroy()
          attachSrc()
      }
    })

    return () => hls.destroy()
  }, [available, src])

  /* ─── 3. Кнопка «включить звук» ──────────────────────────────────── */
  const handleUnmute = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      video.muted = false
      video.volume = 1
      await video.play()
      setMuted(false)
    } catch (err) {
      console.warn('Не удалось включить звук', err)
    }
  }, [])

  /* ─── 4. UI ──────────────────────────────────────────────────────── */
  if (!available) {
    return (
      <p className='text-center text-xl text-white'>Трансляция не ведётся</p>
    )
  }

  return (
    <div className='relative bg-indigo-900 p-2 rounded-xl'>
      <video
        ref={videoRef}
        className={className}
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
