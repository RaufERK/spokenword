'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LinksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [rutubeUrl, setRutubeUrl] = useState('')
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState<string | null>(null)
  const [currentRutubeUrl, setCurrentRutubeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Проверка доступа
  useEffect(() => {
    if (status === 'loading') return

    if (
      !session ||
      !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)
    ) {
      router.push('/')
      return
    }
  }, [session, status, router])

  // Загрузка текущих ссылок
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
        headers: {
          'Content-Type': 'application/json',
        },
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
    } catch (error) {
      setMessage('❌ Ошибка при обновлении ссылок')
      console.error('Error updating links:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <div className='text-lg'>Загрузка...</div>
      </div>
    )
  }

  if (
    !session ||
    !['MODERATOR', 'ADMIN', 'SUPER'].includes(session.user.role)
  ) {
    return null
  }

  return (
    <main className='p-4 max-w-2xl mx-auto'>
      <h1 className='text-2xl font-semibold mb-6 text-blue-600'>
        Управление ссылками на трансляции
      </h1>

      {(currentYoutubeUrl || currentRutubeUrl) && (
        <div className='mb-6 p-4 bg-purple-900 rounded-lg'>
          <h2 className='text-lg font-medium mb-3 text-gray-200'>
            Текущие активные ссылки:
          </h2>
          {currentYoutubeUrl && (
            <div className='mb-2'>
              <span className='text-green-400 font-medium'>YouTube: </span>
              <a
                href={currentYoutubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-pink-600 hover:text-blue-800 underline break-all'
              >
                {currentYoutubeUrl}
              </a>
            </div>
          )}
          {currentRutubeUrl && (
            <div>
              <span className='text-green-400 font-medium'>Rutube: </span>
              <a
                href={currentRutubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-pink-600 hover:text-blue-800 underline break-all'
              >
                {currentRutubeUrl}
              </a>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='youtubeUrl' className='block font-medium text-blue-500 mb-2'>
            Ссылка на YouTube:
          </label>
          <input
            type='url'
            id='youtubeUrl'
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder='https://www.youtube.com/watch?v=...'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:border-transparent text-gray-400 hover:text-gray-300'
          />
        </div>

        <div>
          <label htmlFor='rutubeUrl' className='block font-medium text-blue-500 mb-2'>
            Ссылка на Rutube:
          </label>
          <input
            type='url'
            id='rutubeUrl'
            value={rutubeUrl}
            onChange={(e) => setRutubeUrl(e.target.value)}
            placeholder='https://rutube.ru/video/...'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:border-transparent text-gray-400 hover:text-gray-300'
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Обновление...' : 'Обновить ссылки'}
        </button>
      </form>

      {message && (
        <div className='mt-4 p-3 rounded-md bg-gray-50 border text-purple-800 text-bold'>
          {message}
        </div>
      )}

      <div className='mt-8 p-4 bg-blue-50 rounded-lg'>
        <h3 className='font-medium text-blue-900 mb-2'>Инструкция:</h3>
        <ul className='text-sm text-blue-800 space-y-1'>
          <li>• Вставьте ссылки на YouTube и/или Rutube</li>
          <li>• Можно заполнить одну или обе ссылки</li>
          <li>• Ссылки будут отображаться на главной странице</li>
          <li>• Аудиострим отображается автоматически (https://audio.spoken-word.ru/)</li>
        </ul>
      </div>
    </main>
  )
}
