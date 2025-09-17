'use client'

import { useState, useEffect } from 'react'
import HlsPlayer from '@/components/HlsPlayer'
import StreamLinkBlock from '@/components/StreamLinkBlock'

export default function LivePage() {
  const [streamKey] = useState<string>('main')
  const [streamUrl, setStreamUrl] = useState<string>('')
  const [isLive, setIsLive] = useState<boolean>(false)

  useEffect(() => {
    // Проверяем доступность стрима
    const checkStream = async () => {
      try {
        const response = await fetch(`/api/stream-status?key=${streamKey}`)
        const data = await response.json()
        setIsLive(data.isLive)

        if (data.isLive) {
          setStreamUrl(`https://spoken-word.ru/live/${streamKey}/index.m3u8`)
        } else {
          setStreamUrl('')
        }
      } catch (error) {
        console.error('Error checking stream status:', error)
        setIsLive(false)
        setStreamUrl('')
      }
    }

    checkStream()

    // Проверяем каждые 10 секунд
    const interval = setInterval(checkStream, 10000)

    return () => clearInterval(interval)
  }, [streamKey])

  return (
    <div className='min-h-screen bg-gray-100'>
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-6xl mx-auto'>
          {/* Заголовок */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              Прямая трансляция
            </h1>
            <p className='text-gray-600'>
              Смотрите наши мероприятия в прямом эфире
            </p>
          </div>

          {/* Блок с ссылкой на стрим */}
          <div className='mb-6'>
            <StreamLinkBlock />
          </div>

          {/* Основной плеер */}
          <div className='mb-8'>
            {isLive ? (
              <div>
                <div className='flex items-center mb-4'>
                  <div className='flex items-center'>
                    <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2'></div>
                    <span className='text-lg font-semibold text-gray-900'>
                      В эфире
                    </span>
                  </div>
                </div>

                <HlsPlayer streamUrl={streamUrl} className='w-full h-auto' />
              </div>
            ) : (
              <div className='bg-gray-900 rounded-lg p-12 text-center'>
                <div className='text-gray-400 mb-4'>
                  <svg
                    className='w-20 h-20 mx-auto mb-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={1.5}
                      d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                    />
                  </svg>
                  <h3 className='text-xl font-semibold mb-2'>
                    Трансляция не ведется
                  </h3>
                  <p className='text-gray-500'>
                    В данный момент нет активной трансляции. Следите за
                    расписанием мероприятий.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Информация о стриме */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='bg-white rounded-lg p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Информация о трансляции
              </h3>
              <div className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Статус:</span>
                  <span
                    className={`font-medium ${
                      isLive ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {isLive ? 'В эфире' : 'Неактивна'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Качество:</span>
                  <span className='font-medium text-gray-900'>HD</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Формат:</span>
                  <span className='font-medium text-gray-900'>HLS</span>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                Поддержка браузеров
              </h3>
              <div className='space-y-2 text-sm text-gray-600'>
                <div className='flex items-center'>
                  <svg
                    className='w-4 h-4 text-green-500 mr-2'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  Safari (нативный HLS)
                </div>
                <div className='flex items-center'>
                  <svg
                    className='w-4 h-4 text-green-500 mr-2'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  Chrome, Firefox, Edge (HLS.js)
                </div>
                <div className='flex items-center'>
                  <svg
                    className='w-4 h-4 text-green-500 mr-2'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  Мобильные браузеры
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
