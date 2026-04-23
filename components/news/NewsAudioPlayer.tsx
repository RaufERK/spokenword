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
    <div className={className}>
      <div className='rounded-lg border border-white/10 bg-black/20 p-2'>
        <div className='mb-2 flex items-center gap-2 text-xs text-white/60'>
          <span className='text-sm leading-none'>♪</span>
          <span>{getAudioLabel(mediaType)}</span>
        </div>
        <audio controls preload='none' className='h-10 w-full'>
          <source src={src} />
          Ваш браузер не поддерживает аудио.
        </audio>
      </div>
    </div>
  )
}
