// ---------- components/StreamControls.tsx ----------
'use client'
import { useState } from 'react'

export default function StreamControls() {
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<boolean | null>(null)

  const getStatus = async () => {
    const res = await fetch('/api/status')
    const { streaming } = await res.json()
    setActive(streaming)
  }
  const toggle = async () => {
    setLoading(true)
    await fetch(active ? '/api/stop' : '/api/start', { method: 'POST' })
    await getStatus()
    setLoading(false)
  }

  return (
    <div className='flex items-center gap-6 bg-white p-6 rounded-xl shadow border border-gray-300'>
      <button
        onClick={toggle}
        disabled={loading}
        className='px-6 py-3 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
      >
        {active ? 'Остановить трансляцию' : 'Начать трансляцию'}
      </button>
      <span className='text-lg font-semibold text-green-800'>
        Состояние:{' '}
        <span
          className={
            active === null
              ? 'text-gray-500'
              : active
              ? 'inline-block bg-green-200 text-green-800 px-3 py-1 rounded'
              : 'inline-block bg-red-200 text-red-800 px-3 py-1 rounded'
          }
        >
          {active === null ? '…' : active ? 'Идёт' : 'Не идёт'}
        </span>
      </span>
    </div>
  )
}
