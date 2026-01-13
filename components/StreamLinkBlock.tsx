'use client'

import { useState, useEffect } from 'react'

export default function StreamLinkBlock() {
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const [rutubeUrl, setRutubeUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const audioUrl = 'https://audio.spoken-word.ru/'

  useEffect(() => {
    fetchStreamLinks()
  }, [])

  const fetchStreamLinks = async () => {
    try {
      const response = await fetch('/api/stream-link')
      const result = await response.json()

      if (result.success && result.data) {
        setYoutubeUrl(result.data.youtubeUrl)
        setRutubeUrl(result.data.rutubeUrl)
      }
    } catch (error) {
      console.error('Error fetching stream links:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='w-full max-w-3xl bg-gray-100 rounded-lg p-6 animate-pulse'>
        <div className='h-4 bg-gray-300 rounded mb-3 w-48'></div>
        <div className='h-12 bg-gray-300 rounded w-full'></div>
      </div>
    )
  }

  if (!youtubeUrl && !rutubeUrl && !audioUrl) {
    return null
  }

  return (
    <div className='w-full max-w-3xl bg-purple-900 border border-blue-800 rounded-lg p-6'>
      <h2 className='text-xl font-semibold text-green-400 mb-5 text-center'>
        🎧 Подключение к трансляции
      </h2>
      <div className='flex flex-col sm:flex-row gap-4 justify-center items-stretch'>
        {youtubeUrl && (
          <a
            href={youtubeUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105'
          >
            <svg
              className='w-8 h-8'
              fill='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' />
            </svg>
            <span>YouTube</span>
          </a>
        )}
        {rutubeUrl && (
          <a
            href={rutubeUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105'
          >
            <svg
              className='w-8 h-8'
              fill='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z' />
            </svg>
            <span>Rutube</span>
          </a>
        )}
        <a
          href={audioUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105'
        >
          <svg
            className='w-8 h-8'
            fill='currentColor'
            viewBox='0 0 24 24'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path d='M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z' />
          </svg>
          <span>Audio</span>
        </a>
      </div>
    </div>
  )
}
