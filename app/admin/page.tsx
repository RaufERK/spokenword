'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [streaming, setStreaming] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    fetchStatus()

    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
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

  const toggleStream = async () => {
    setLoading(true)
    try {
      const endpoint = streaming ? '/api/stop' : '/api/start'
      await fetch(endpoint, { method: 'POST' })
    } catch (error) {
      console.error('Ошибка при переключении трансляции:', error)
    }
    await fetchStatus()
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

      <button
        onClick={toggleStream}
        disabled={loading}
        className={`rounded px-6 py-3 text-white transition ${
          streaming
            ? 'bg-gray-500 hover:bg-gray-600'
            : 'bg-blue-500 hover:bg-blue-600'
        } disabled:opacity-50`}
      >
        {streaming ? 'Остановить трансляцию' : 'Начать трансляцию'}
      </button>
    </div>
  )
}
