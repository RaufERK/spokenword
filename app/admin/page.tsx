'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, AlertCircle } from 'lucide-react'

export default function AdminLinksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [rutubeUrl, setRutubeUrl] = useState('')
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string | null>(null)
  const [currentRutubeUrl, setCurrentRutubeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  const handleDelete = async () => {
    if (!confirm('Удалить все ссылки стрима?')) return
    setDeleting(true)
    setMessage('')
    try {
      const response = await fetch('/api/stream-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: '', rutubeUrl: '' }),
      })
      const result = await response.json()
      if (result.success) {
        setYoutubeUrl('')
        setRutubeUrl('')
        setCurrentYoutubeUrl(null)
        setCurrentRutubeUrl(null)
        setMessage('✅ Ссылки удалены')
      } else {
        setMessage(`❌ Ошибка: ${result.error}`)
      }
    } catch {
      setMessage('❌ Ошибка при удалении ссылок')
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center min-h-[50vh]'>
        <div className='text-lg text-purple-200'>Загрузка...</div>
      </div>
    )
  }

  if (!session || !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)) {
    return null
  }

  const hasLinks = !!(currentYoutubeUrl || currentRutubeUrl)

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-white'>Стрим</h1>
        <p className='text-purple-200 text-sm mt-1'>Ссылки для открытых мероприятий (Службы)</p>
      </div>

      {hasLinks && (
        <div className='bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm border border-pink-400/20 rounded-xl p-4'>
          <div className='flex items-start gap-3'>
            <AlertCircle className='w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5' />
            <div className='text-sm'>
              <p className='text-purple-200 mb-1 font-medium'>Текущие активные ссылки:</p>
              {currentYoutubeUrl && (
                <div>
                  <span className='text-green-400 font-medium'>YouTube: </span>
                  <a href={currentYoutubeUrl} target='_blank' rel='noopener noreferrer'
                    className='text-purple-200 hover:text-white underline break-all'>
                    {currentYoutubeUrl}
                  </a>
                </div>
              )}
              {currentRutubeUrl && (
                <div>
                  <span className='text-green-400 font-medium'>Rutube: </span>
                  <a href={currentRutubeUrl} target='_blank' rel='noopener noreferrer'
                    className='text-purple-200 hover:text-white underline break-all'>
                    {currentRutubeUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className='bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm border border-pink-400/20 rounded-2xl shadow-2xl p-8 space-y-5'>
        <form onSubmit={handleSubmit} className='space-y-5'>
          <div>
            <label htmlFor='youtubeUrl' className='block text-white mb-2'>
              Ссылка на YouTube:
            </label>
            <input
              type='url'
              id='youtubeUrl'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder='https://www.youtube.com/watch?v=...'
              className='w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all'
            />
          </div>

          <div>
            <label htmlFor='rutubeUrl' className='block text-white mb-2'>
              Ссылка на Rutube:
            </label>
            <input
              type='url'
              id='rutubeUrl'
              value={rutubeUrl}
              onChange={(e) => setRutubeUrl(e.target.value)}
              placeholder='https://rutube.ru/video/...'
              className='w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50'
          >
            <Save className='w-5 h-5' />
            {loading ? 'Обновление...' : 'Обновить ссылки'}
          </button>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              message.startsWith('✅')
                ? 'bg-green-900/40 text-green-300 border border-green-500/30'
                : 'bg-red-900/40 text-red-300 border border-red-500/30'
            }`}>
              {message}
            </div>
          )}

          <button
            type='button'
            onClick={handleDelete}
            disabled={deleting || !hasLinks}
            className='w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'
          >
            <Trash2 className='w-5 h-5' />
            {deleting ? 'Удаление...' : 'Удалить все ссылки'}
          </button>
        </form>
      </div>

      <div className='bg-gradient-to-br from-purple-900/40 to-purple-800/30 border border-purple-400/20 rounded-xl p-4'>
        <ul className='text-purple-200 space-y-1 text-xs'>
          <li>• Ссылки Служб отображаются на главной странице для всех пользователей</li>
          <li>• Аудиострим: https://audio.spoken-word.ru/</li>
        </ul>
      </div>
    </div>
  )
}
