type NewsAudioPlayerProps = {
  src: string
  mediaType?: string | null
  className?: string
}

function getAudioLabel(mediaType?: string | null): string {
  return mediaType === 'voice' ? 'Голосовое сообщение' : 'Аудио'
}

export default function NewsAudioPlayer({
  src,
  mediaType,
  className,
}: NewsAudioPlayerProps) {
  return (
    <details className={className}>
      <summary className='cursor-pointer list-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10'>
        <span className='inline-flex items-center gap-2'>
          <span className='text-base leading-none'>♪</span>
          <span>{getAudioLabel(mediaType)}</span>
        </span>
      </summary>
      <div className='mt-2 rounded-lg border border-white/10 bg-black/20 p-2'>
        <audio controls preload='none' className='h-10 w-full'>
          <source src={src} />
          Ваш браузер не поддерживает аудио.
        </audio>
      </div>
    </details>
  )
}
