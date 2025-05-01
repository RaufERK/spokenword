// src/app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [streaming, setStreaming] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  // Получаем статус при загрузке страницы
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStreaming(data.streaming)
    } catch (error) {
      console.error('Ошибка при получении статуса трансляции:', error)
    }
  }

  const startStream = async () => {
    setLoading(true)
    try {
      await fetch('/api/start', { method: 'POST' })
      setStreaming(true)
    } catch (error) {
      console.error('Ошибка при запуске трансляции:', error)
    }
    setLoading(false)
  }

  const stopStream = async () => {
    setLoading(true)
    try {
      await fetch('/api/stop', { method: 'POST' })
      setStreaming(false)
    } catch (error) {
      console.error('Ошибка при остановке трансляции:', error)
    }
    setLoading(false)
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4 text-black'>
      <h1 className='mb-8 text-3xl font-bold'>Управление трансляцией</h1>

      <div className='mb-4'>
        {streaming ? (
          <span className='rounded bg-green-500 px-4 py-2 text-white'>
            Трансляция идёт
          </span>
        ) : (
          <span className='rounded bg-red-500 px-4 py-2 text-white'>
            Трансляция остановлена
          </span>
        )}
      </div>

      <div className='flex gap-4'>
        <button
          onClick={startStream}
          disabled={loading || streaming}
          className='rounded bg-blue-500 px-6 py-3 text-white hover:bg-blue-600 disabled:opacity-50'
        >
          Начать трансляцию
        </button>

        <button
          onClick={stopStream}
          disabled={loading || !streaming}
          className='rounded bg-gray-500 px-6 py-3 text-white hover:bg-gray-600 disabled:opacity-50'
        >
          Остановить трансляцию
        </button>
      </div>
    </div>
  )
}
