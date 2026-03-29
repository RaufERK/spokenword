'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, PlayCircle, Calendar, Clock, Eye } from 'lucide-react'

interface ClassFile {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
  views: number
  duration: number | null
}

interface StreamLinks {
  youtubeUrl: string | null
  rutubeUrl: string | null
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}ч ${m}мин`
  return `${m}мин`
}

function formatSize(bytes: number) {
  const mb = bytes / 1024 / 1024
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} ГБ`
  return `${mb.toFixed(0)} МБ`
}

export default function ClassPage() {
  const [files, setFiles] = useState<ClassFile[]>([])
  const [streamLinks, setStreamLinks] = useState<StreamLinks>({ youtubeUrl: null, rutubeUrl: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/class').then((r) => r.json()),
      fetch('/api/class/stream-links').then((r) => r.json()),
    ])
      .then(([filesData, linksData]) => {
        setFiles(filesData)
        if (linksData.success) setStreamLinks(linksData.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const hasStream = streamLinks.youtubeUrl || streamLinks.rutubeUrl

  if (loading) {
    return (
      <main className='max-w-4xl mx-auto p-4'>
        <div className='animate-pulse space-y-4'>
          <div className='h-8 bg-gray-700 rounded w-64' />
          <div className='h-24 bg-gray-700 rounded' />
          <div className='h-24 bg-gray-700 rounded' />
        </div>
      </main>
    )
  }

  return (
    <main className='max-w-4xl mx-auto p-4'>
      <div className='flex items-center gap-3 mb-6'>
        <GraduationCap className='w-8 h-8 text-green-400' />
        <h1 className='text-2xl font-semibold'>Архив учебного класса</h1>
      </div>

      {hasStream && (
        <div className='bg-purple-900 border border-blue-700 rounded-lg p-5 mb-6'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-3 h-3 rounded-full bg-red-500 animate-pulse' />
            <span className='text-green-400 font-semibold'>Идёт трансляция Класса</span>
          </div>
          <div className='flex flex-col sm:flex-row gap-3'>
            {streamLinks.youtubeUrl && (
              <a
                href={streamLinks.youtubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all transform hover:scale-105 font-semibold'
              >
                <PlayCircle className='w-5 h-5' />
                <span>YouTube</span>
              </a>
            )}
            {streamLinks.rutubeUrl && (
              <a
                href={streamLinks.rutubeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all transform hover:scale-105 font-semibold'
              >
                <PlayCircle className='w-5 h-5' />
                <span>Rutube</span>
              </a>
            )}
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <div className='text-center py-16 text-gray-400'>
          <GraduationCap className='w-16 h-16 mx-auto mb-4 opacity-30' />
          <p className='text-lg'>Записи пока не добавлены</p>
        </div>
      ) : (
        <div className='space-y-3'>
          <h2 className='text-lg font-medium text-gray-300 mb-4'>Записи занятий</h2>
          {files.map((file) => (
            <div
              key={file.id}
              className='bg-purple-950 border border-purple-800 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-green-500 transition-colors'
            >
              <div className='flex-1 min-w-0'>
                <h3 className='font-medium text-white truncate'>{file.displayName}</h3>
                <div className='flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-400'>
                  <span className='flex items-center gap-1'>
                    <Calendar className='w-3.5 h-3.5' />
                    {new Date(file.uploadedAt).toLocaleDateString('ru-RU')}
                  </span>
                  {formatDuration(file.duration) && (
                    <span className='flex items-center gap-1'>
                      <Clock className='w-3.5 h-3.5' />
                      {formatDuration(file.duration)}
                    </span>
                  )}
                  <span className='flex items-center gap-1'>
                    <Eye className='w-3.5 h-3.5' />
                    {file.views}
                  </span>
                  <span className='text-blue-400'>{formatSize(file.size)}</span>
                </div>
              </div>
              <Link
                href={`/watch-class/${encodeURIComponent(file.systemName)}`}
                className='flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap flex-shrink-0'
              >
                <PlayCircle className='w-4 h-4' />
                <span>Смотреть</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
