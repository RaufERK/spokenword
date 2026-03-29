'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLinksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [rutubeUrl, setRutubeUrl] = useState('')
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string | null>(null)
  const [currentRutubeUrl, setCurrentRutubeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)) {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchCurrentLinks()
  }, [])

  const fetchCurrentLinks = async () => {
    try {
      const response = await fetch('/api/stream-link')
      const result = await response.json()
      if (result.success) {
        setCurrentYoutubeUrl(result.data.youtubeUrl)
        setCurrentRutubeUrl(result.data.rutubeUrl)
        setYoutubeUrl(result.data.youtubeUrl || '')
        setRutubeUrl(result.data.rutubeUrl || '')
      }
    } catch (error) {
      console.error('Error fetching current links:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/stream-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, rutubeUrl }),
      })
      const result = await response.json()
      if (result.success) {
        setCurrentYoutubeUrl(youtubeUrl)
        setCurrentRutubeUrl(rutubeUrl)
        setMessage('✅ Ссылки успешно обновлены!')
      } else {
        setMessage(`❌ Ошибка: ${result.error}`)
      }
    } catch {
      setMessage('❌ Ошибка при обновлении ссылок')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center min-h-[50vh]'>
        <div className='text-lg text-pink-200'>Загрузка...</div>
      </div>
    )
  }

  if (!session || !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)) {
    return null
  }

  return (
    <div className='max-w-2xl mx-auto'>
      <h1 className='text-2xl font-semibold mb-6 text-white'>
        Ссылки на трансляцию (Службы)
      </h1>

      {(currentYoutubeUrl || currentRutubeUrl) && (
        <div className='mb-6 p-4 bg-pink-900/40 backdrop-blur-sm border border-pink-400/30 rounded-xl'>
          <h2 className='text-sm font-medium mb-2 text-pink-200 uppercase tracking-wider'>
            Текущие активные ссылки:
          </h2>
          {currentYoutubeUrl && (
            <div className='mb-1'>
              <span className='text-green-400 font-medium text-sm'>YouTube: </span>
              <a
                href={currentYoutubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-pink-200 hover:text-white underline break-all text-sm'
              >
                {currentYoutubeUrl}
              </a>
            </div>
          )}
          {currentRutubeUrl && (
            <div>
              <span className='text-green-400 font-medium text-sm'>Rutube: </span>
              <a
                href={currentRutubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-pink-200 hover:text-white underline break-all text-sm'
              >
                {currentRutubeUrl}
              </a>
            </div>
          )}
        </div>
      )}

      <div className='bg-pink-900/40 backdrop-blur-sm border border-pink-500/30 rounded-2xl p-6 space-y-4'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='youtubeUrl' className='block text-pink-200 text-sm mb-1.5'>
              Ссылка на YouTube:
            </label>
            <input
              type='url'
              id='youtubeUrl'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder='https://www.youtube.com/watch?v=...'
              className='w-full px-3 py-2 bg-pink-950/60 border border-pink-600/50 rounded-lg text-white placeholder-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400'
            />
          </div>

          <div>
            <label htmlFor='rutubeUrl' className='block text-pink-200 text-sm mb-1.5'>
              Ссылка на Rutube:
            </label>
            <input
              type='url'
              id='rutubeUrl'
              value={rutubeUrl}
              onChange={(e) => setRutubeUrl(e.target.value)}
              placeholder='https://rutube.ru/video/...'
              className='w-full px-3 py-2 bg-pink-950/60 border border-pink-600/50 rounded-lg text-white placeholder-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-pink-600 hover:bg-pink-700 text-white py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium'
          >
            {loading ? 'Обновление...' : 'Обновить ссылки'}
          </button>
        </form>

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            message.startsWith('✅')
              ? 'bg-green-900/40 text-green-300 border border-green-500/30'
              : 'bg-red-900/40 text-red-300 border border-red-500/30'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className='mt-6 p-4 bg-pink-900/30 border border-pink-500/20 rounded-xl'>
        <p className='text-xs text-pink-300 space-y-1'>
          <span className='block'>• Ссылки Служб отображаются на главной странице (временно отключено)</span>
          <span className='block'>• Аудиострим: https://audio.spoken-word.ru/</span>
        </p>
      </div>
    </div>
  )
}
