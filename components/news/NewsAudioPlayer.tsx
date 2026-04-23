type NewsAudioPlayerProps = {
  src: string
  className?: string
}

export default function NewsAudioPlayer({
  src,
  className,
}: NewsAudioPlayerProps) {
  return (
    <div className={className}>
      <audio controls preload='none' className='h-10 w-full'>
        <source src={src} />
        Ваш браузер не поддерживает аудио.
      </audio>
    </div>
  )
}
