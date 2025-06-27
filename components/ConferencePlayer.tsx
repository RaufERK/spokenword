'use client'

export default function ConferencePlayer({ src }: { src: string }) {
  return (
    <div className='relative bg-indigo-900 p-2 rounded-xl'>
      <video
        src={src}
        controls
        style={{ width: '100%', maxHeight: 480, background: '#000' }}
        preload='none'
      />
    </div>
  )
}
