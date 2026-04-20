'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_INTERVAL_MS = 15_000

export default function NewsAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }

    const intervalId = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS)

    const handleVisibilityChange = () => {
      refreshIfVisible()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [router])

  return null
}
