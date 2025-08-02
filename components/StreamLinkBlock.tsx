'use client'

import { useState, useEffect } from 'react'

export default function StreamLinkBlock() {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStreamLink()
  }, [])

  const fetchStreamLink = async () => {
    try {
      const response = await fetch('/api/stream-link')
      const result = await response.json()

      if (result.success && result.data) {
        setStreamUrl(result.data)
      }
    } catch (error) {
      console.error('Error fetching stream link:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='w-full max-w-3xl bg-gray-100 rounded-lg p-6 animate-pulse'>
        <div className='h-4 bg-gray-300 rounded mb-3 w-48'></div>
        <div className='h-4 bg-gray-300 rounded w-3/4'></div>
      </div>
    )
  }

  if (!streamUrl) {
    return null
  }

  return (
    <div className='w-full max-w-3xl bg-purple-900 border border-blue-800 rounded-lg p-6'>
      <h2 className='text-lg font-semibold text-green-400 mb-3'>
        Подключение к трансляции:
      </h2>
      <a
        href={streamUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-flex items-center text-blue-400 hover:text-blue-300 underline break-all'
      >
        {streamUrl}
        <svg
          className='ml-2 h-4 w-4 flex-shrink-0'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
          />
        </svg>
      </a>
    </div>
  )
}
