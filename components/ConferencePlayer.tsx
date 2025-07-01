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
    fetch(`/api/conf-archive/${encodeURIComponent(systemName)}/view`, {
      method: 'POST',
    }).catch(() => {})
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
