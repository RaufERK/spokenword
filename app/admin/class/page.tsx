'use client'

import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, Save, Trash2, PlayCircle, Eye, Calendar, Clock } from 'lucide-react'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'compressing' | 'done' | 'error'
type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'unknown'

interface ClassFile {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
  views: number
  duration: number | null
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}ч ${m}мин`
  return `${m}мин`
}

export default function AdminClassPage() {
  const { data } = useSession()
  const role = data?.user?.role

  // Stream links state
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [rutubeUrl, setRutubeUrl] = useState('')
  const [linksSaving, setLinksSaving] = useState(false)
  const [linksMessage, setLinksMessage] = useState('')

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Archive state
  const [files, setFiles] = useState<ClassFile[]>([])
  const [refreshList, setRefreshList] = useState(0)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    fetch('/api/class/stream-links')
      .then((r) => r.json())
      .then((result) => {
        if (result.success && result.data) {
          setYoutubeUrl(result.data.youtubeUrl || '')
          setRutubeUrl(result.data.rutubeUrl || '')
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/class')
      .then((r) => r.json())
      .then(setFiles)
      .catch(console.error)
  }, [refreshList])

  const handleSaveLinks = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinksSaving(true)
    setLinksMessage('')
    try {
      const res = await fetch('/api/class/stream-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, rutubeUrl }),
      })
      const result = await res.json()
      setLinksMessage(result.success ? '✅ Ссылки успешно обновлены!' : `❌ Ошибка: ${result.error}`)
    } catch {
      setLinksMessage('❌ Ошибка при обновлении ссылок')
    } finally {
      setLinksSaving(false)
    }
  }

  const pollJobStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/job-status/${id}`)
      if (!res.ok) return
      const data = await res.json()
      const state: JobState = data.state || 'unknown'
      const progress = data.progress || 0

      if (state === 'active') {
        setStatus('compressing')
        setCompressionProgress(progress)
      } else if (state === 'completed') {
        setStatus('done')
        setCompressionProgress(100)
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setRefreshList((prev) => prev + 1)
      } else if (state === 'failed') {
        setStatus('error')
        setUploadError(data.error || 'Ошибка компрессии')
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    if (!file) return setUploadError('Выберите файл')
    if (!displayName.trim()) return setUploadError('Введите название')

    setStatus('uploading')
    setUploadProgress(0)
    setCompressionProgress(0)

    const form = new FormData()
    form.append('file', file)
    form.append('displayName', displayName)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText)
        setUploadProgress(100)
        setStatus('processing')
        if (data.jobId) {
          setJobId(data.jobId)
          pollIntervalRef.current = setInterval(() => pollJobStatus(data.jobId), 1000)
        } else {
          setStatus('done')
          resetUploadForm()
        }
      } else {
        setStatus('error')
        const data = JSON.parse(xhr.responseText || '{}')
        setUploadError(data.error || 'Ошибка загрузки')
      }
    })

    xhr.addEventListener('error', () => {
      setStatus('error')
      setUploadError('Ошибка сети')
    })

    const uploadUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3006/upload/class'
      : '/api/class/upload'
    xhr.open('POST', uploadUrl)
    xhr.send(form)
  }

  const resetUploadForm = () => {
    setStatus('idle')
    setFile(null)
    setDisplayName('')
    setUploadProgress(0)
    setCompressionProgress(0)
    setJobId(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleDelete = async (systemName: string, name: string) => {
    if (!confirm(`Удалить файл "${name}"?`)) return
    try {
      const res = await fetch(`/api/class/${encodeURIComponent(systemName)}`, { method: 'DELETE' })
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.systemName !== systemName))
      } else {
        alert('❌ Ошибка удаления файла')
      }
    } catch {
      alert('❌ Ошибка удаления файла')
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading': return `Загрузка файла... ${uploadProgress}%`
      case 'processing': return 'Обработка файла...'
      case 'compressing': return `Сжатие видео... ${compressionProgress}%`
      case 'done': return 'Готово!'
      case 'error': return 'Ошибка'
      default: return ''
    }
  }

  const isProcessing = ['uploading', 'processing', 'compressing'].includes(status)

  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return <div className='p-10 text-red-400'>Нет доступа.</div>
  }

  return (
    <div className='max-w-4xl mx-auto space-y-8'>
      <div className='flex items-center gap-3'>
        <GraduationCap className='w-8 h-8 text-green-400' />
        <h1 className='text-2xl font-bold text-white'>Управление учебным классом</h1>
      </div>

      {/* Ссылки на трансляцию */}
      <div className='bg-pink-900/40 backdrop-blur-sm border border-pink-700/50 rounded-2xl p-6'>
        <h2 className='text-lg font-semibold mb-4 text-green-400'>Ссылки на трансляцию Класса</h2>
        <form onSubmit={handleSaveLinks} className='space-y-4'>
          <div>
            <label className='block text-pink-200 mb-1 text-sm'>YouTube:</label>
            <input
              type='url'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder='https://youtube.com/live/...'
              className='w-full px-3 py-2 bg-pink-950/60 border border-pink-600/50 rounded-lg text-white placeholder-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400'
            />
          </div>
          <div>
            <label className='block text-pink-200 mb-1 text-sm'>Rutube:</label>
            <input
              type='url'
              value={rutubeUrl}
              onChange={(e) => setRutubeUrl(e.target.value)}
              placeholder='https://rutube.ru/video/...'
              className='w-full px-3 py-2 bg-pink-950/60 border border-pink-600/50 rounded-lg text-white placeholder-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400'
            />
          </div>
          <button
            type='submit'
            disabled={linksSaving}
            className='flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition'
          >
            <Save className='w-4 h-4' />
            {linksSaving ? 'Сохранение...' : 'Обновить ссылки'}
          </button>
          {linksMessage && (
            <p className={`text-sm ${linksMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {linksMessage}
            </p>
          )}
        </form>
        <p className='text-xs text-pink-400 mt-3'>
          Чтобы убрать трансляцию — очистите оба поля и сохраните.
        </p>
      </div>

      {/* Загрузка видео */}
      <div className='bg-pink-900/40 backdrop-blur-sm border border-pink-600/50 rounded-2xl p-6'>
        <h2 className='text-lg font-semibold mb-4 text-pink-200'>Загрузка записи в архив</h2>
        <form onSubmit={handleUpload} className='space-y-4'>
          <div>
            <label className='block text-pink-200 mb-1 text-sm'>Название:</label>
            <input
              type='text'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder='Учебный класс — Занятие #12'
              className='w-full px-3 py-2 bg-pink-950/60 border border-pink-600/50 rounded-lg text-white placeholder-pink-400/60 focus:outline-none focus:ring-2 focus:ring-pink-400'
              disabled={isProcessing}
            />
          </div>
          <div>
            <label className='block text-pink-200 mb-1 text-sm'>Файл (.mp4):</label>
            <input
              type='file'
              accept='video/mp4'
              ref={fileInputRef}
              onChange={(e) => {
                setUploadError(null)
                if (e.target.files?.[0]) setFile(e.target.files[0])
              }}
              className='w-full px-3 py-2 bg-pink-950/60 border border-pink-600/50 rounded-lg text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-pink-600 file:text-white hover:file:bg-pink-700'
              disabled={isProcessing}
            />
            {file && (
              <p className='text-xs text-pink-300 mt-1'>
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} МБ)
              </p>
            )}
          </div>

          {uploadError && (
            <div className='text-red-400 text-sm bg-red-900/30 px-3 py-2 rounded-lg'>{uploadError}</div>
          )}

          {status === 'uploading' && (
            <div className='space-y-1'>
              <p className='text-pink-200 text-sm'>{getStatusText()}</p>
              <div className='w-full bg-pink-950 rounded-full h-3'>
                <div className='bg-pink-500 h-full rounded-full transition-all' style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
          {status === 'processing' && (
            <p className='text-yellow-300 text-sm animate-pulse'>{getStatusText()}</p>
          )}
          {status === 'compressing' && (
            <div className='space-y-1'>
              <p className='text-pink-200 text-sm'>{getStatusText()}</p>
              <div className='w-full bg-pink-950 rounded-full h-3'>
                <div className='bg-pink-400 h-full rounded-full transition-all' style={{ width: `${compressionProgress}%` }} />
              </div>
            </div>
          )}
          {status === 'done' && (
            <div className='bg-green-900/30 border border-green-600 rounded-lg p-4'>
              <p className='text-green-400 font-semibold mb-2'>✅ Файл успешно загружен!</p>
              <button onClick={resetUploadForm} className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full'>
                Загрузить ещё
              </button>
            </div>
          )}

          {status !== 'done' && (
            <button
              type='submit'
              disabled={isProcessing || !file || !displayName.trim()}
              className='w-full py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition'
            >
              {isProcessing ? getStatusText() : 'Загрузить'}
            </button>
          )}
        </form>
      </div>

      {/* Архив */}
      <div className='bg-pink-900/40 backdrop-blur-sm border border-pink-700/50 rounded-2xl p-6'>
        <h2 className='text-lg font-semibold mb-4 text-white'>Архив записей</h2>
        {files.length === 0 ? (
          <div className='text-center py-12 text-pink-400'>
            <GraduationCap className='w-12 h-12 mx-auto mb-3 opacity-30' />
            <p>Архив пуст</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {files.map((f) => (
              <div
                key={f.id}
                className='flex items-center justify-between bg-pink-950/50 border border-pink-700/50 hover:border-pink-400/40 rounded-xl px-4 py-3 gap-4 transition'
              >
                <div className='flex-1 min-w-0'>
                  <p className='font-medium text-white truncate'>{f.displayName}</p>
                  <div className='flex flex-wrap gap-3 mt-1 text-xs text-pink-300'>
                    <span className='flex items-center gap-1'>
                      <Calendar className='w-3 h-3' />
                      {new Date(f.uploadedAt).toLocaleDateString('ru-RU')}
                    </span>
                    {formatDuration(f.duration) && (
                      <span className='flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {formatDuration(f.duration)}
                      </span>
                    )}
                    <span className='flex items-center gap-1'>
                      <Eye className='w-3 h-3' />
                      {f.views}
                    </span>
                    <span className='text-pink-200'>
                      {(f.size / 1024 / 1024).toFixed(0)} МБ
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-2 flex-shrink-0'>
                  <Link
                    href={`/watch-class/${encodeURIComponent(f.systemName)}`}
                    target='_blank'
                    className='flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition'
                  >
                    <PlayCircle className='w-4 h-4' />
                    <span>Смотреть</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(f.systemName, f.displayName)}
                    className='p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
