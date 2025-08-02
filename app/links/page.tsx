'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LinksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
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

  // Загрузка текущей ссылки
  useEffect(() => {
    fetchCurrentLink()
  }, [])

  const fetchCurrentLink = async () => {
    try {
      const response = await fetch('/api/stream-link')
      const result = await response.json()

      if (result.success) {
        setCurrentUrl(result.data)
        setUrl(result.data || '')
      }
    } catch (error) {
      console.error('Error fetching current link:', error)
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
        body: JSON.stringify({ url }),
      })

      const result = await response.json()

      if (result.success) {
        setCurrentUrl(url)
        setMessage('✅ Ссылка успешно обновлена!')
      } else {
        setMessage(`❌ Ошибка: ${result.error}`)
      }
    } catch (error) {
      setMessage('❌ Ошибка при обновлении ссылки')
      console.error('Error updating link:', error)
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
        Управление ссылками
      </h1>

      {currentUrl && (
        <div className='mb-6 p-4 bg-purple-900 rounded-lg'>
          <h2 className='text-lg font-medium mb-2 text-gray-200'>
            Текущая активная ссылка:
          </h2>
          <a
            href={currentUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='text-pink-600 hover:text-blue-800 underline break-all'
          >
            {currentUrl}
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label htmlFor='url' className='block font-medium text-blue-500 mb-2'>
            Ссылка на трансляцию:
          </label>
          <input
            type='url'
            id='url'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder='https://www.youtube.com/watch?v=...'
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2
            focus:ring-blue-500 focus:border-transparent text-gray-400 hover:text-gray-300'
            required
          />
        </div>

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Обновление...' : 'Обновить ссылку'}
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
          <li>• Вставьте полную ссылку на трансляцию YouTube</li>
          <li>• Ссылка будет отображаться на главной странице</li>
          <li>
            • При обновлении предыдущая ссылка автоматически деактивируется
          </li>
        </ul>
      </div>
    </main>
  )
}
