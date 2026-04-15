import { redirect } from 'next/navigation'

export default function AudioPage() {
  const audioUrl = process.env.AUDIO_STREAM_URL ?? 'https://audio.spoken-word.ru/'
  redirect(audioUrl)
}
