// components/ConferencePlayer.tsx
'use client'

import { useEffect } from 'react'

export default function ConferencePlayer({
  src,
  systemName,
}: {
  src: string
  systemName: string
}) {
  useEffect(() => {
    console.log('[ConferencePlayer] Incrementing view for:', systemName)
    fetch(`/api/conf-archive/${encodeURIComponent(systemName)}/view`, {
      method: 'POST',
    })
      .then((res) => {
        if (res.ok) {
          console.log('[ConferencePlayer] ✅ View counted')
        } else {
          console.error('[ConferencePlayer] ❌ Failed to count view:', res.status)
        }
      })
      .catch((err) => {
        console.error('[ConferencePlayer] ❌ Error counting view:', err)
      })
  }, [systemName])

  return (
    <div className='relative bg-indigo-900 p-2 rounded-xl'>
      <video
        src={src}
        controls
        controlsList='nodownload'
        style={{ width: '100%', maxHeight: 480, background: '#000' }}
        preload='none'
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  )
}
