'use client'

import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'compressing' | 'done' | 'error'
type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'unknown'

type ConfFile = {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
  views: number
  isPublic: boolean
}

export default function AdminUploadPage() {
  const { data } = useSession()
  const role = data?.user?.role

  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [files, setFiles] = useState<ConfFile[]>([])
  const [refreshList, setRefreshList] = useState(0)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    fetchFilesList()
  }, [refreshList])

  const fetchFilesList = async () => {
    try {
      const res = await fetch('/api/conf-archive/list')
      if (res.ok) setFiles(await res.json())
    } catch (err) {
      console.error('Error fetching files list:', err)
    }
  }

  const handleDelete = async (systemName: string, displayName: string) => {
    if (!confirm(`Удалить файл "${displayName}"?`)) return
    try {
      const res = await fetch(`/api/conf-archive/${encodeURIComponent(systemName)}`, { method: 'DELETE' })
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.systemName !== systemName))
        alert('✅ Файл успешно удален')
      } else {
        alert('❌ Ошибка удаления файла')
      }
    } catch {
      alert('❌ Ошибка удаления файла')
    }
  }

  const toggleVisibility = async (systemName: string, currentIsPublic: boolean) => {
    try {
      const res = await fetch(`/api/conf-archive/${encodeURIComponent(systemName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentIsPublic }),
      })
      if (res.ok) {
        setFiles((prev) =>
          prev.map((f) => (f.systemName === systemName ? { ...f, isPublic: !currentIsPublic } : f))
        )
      } else {
        alert('❌ Ошибка изменения видимости')
      }
    } catch {
      alert('❌ Ошибка изменения видимости')
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/job-status/${jobId}`)
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
        setError(data.error || 'Ошибка компрессии')
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    } catch (err) {
      console.error('Error polling job status:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) return setError('Выберите файл')
    if (!displayName.trim()) return setError('Введите название')

    setStatus('uploading')
    setUploadProgress(0)
    setCompressionProgress(0)

    const form = new FormData()
    form.append('file', file)
    form.append('displayName', displayName)

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
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
          resetForm()
        }
      } else {
        setStatus('error')
        const data = JSON.parse(xhr.responseText || '{}')
        setError(data.error || 'Ошибка загрузки')
      }
    })

    xhr.addEventListener('error', () => {
      setStatus('error')
      setError('Ошибка сети')
    })

    const uploadUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3006/upload/conference'
      : '/api/conf-archive/upload'
    xhr.open('POST', uploadUrl)
    xhr.send(form)
  }

  const resetForm = () => {
    setStatus('idle')
    setFile(null)
    setDisplayName('')
    setUploadProgress(0)
    setCompressionProgress(0)
    setJobId(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
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
    return <div className='p-10 text-red-400'>Нет доступа. Только для модераторов и выше.</div>
  }

  return (
    <div className='max-w-6xl mx-auto space-y-8'>
      {/* Upload Form */}
      <div className='bg-gradient-to-br from-blue-900/60 to-purple-900/50 backdrop-blur-sm border border-blue-400/30 rounded-2xl shadow-2xl p-8'>
        <h1 className='text-2xl mb-6 font-bold text-center text-white'>
          Загрузка в Архив
        </h1>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-purple-200 mb-1'>Название файла для архива:</label>
            <input
              type='text'
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className='w-full rounded-lg p-2 text-white bg-purple-950/50 border border-purple-400/30 focus:outline-none focus:ring-2 focus:ring-blue-400'
              disabled={isProcessing}
            />
          </div>
          <div>
            <label className='block text-purple-200 mb-1'>Файл (только .mp4):</label>
            <input
              type='file'
              accept='video/mp4'
              ref={fileInputRef}
              onChange={handleFileChange}
              className='w-full rounded-lg p-2 text-white bg-purple-950/50 border border-purple-400/30'
              disabled={isProcessing}
            />
            {file && (
              <div className='text-xs text-purple-300 mt-1'>
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} МБ)
              </div>
            )}
          </div>

          {error && <div className='text-red-400 p-3 bg-red-900/30 rounded-lg'>{error}</div>}

          {status === 'uploading' && (
            <div className='space-y-2'>
              <div className='text-blue-200 text-sm'>{getStatusText()}</div>
              <div className='w-full bg-purple-950 rounded-full h-4 overflow-hidden'>
                <div className='bg-blue-500 h-full transition-all duration-300' style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className='space-y-2'>
              <div className='text-yellow-300 text-sm animate-pulse'>{getStatusText()}</div>
              <div className='text-xs text-purple-300'>Проверка кодека и подготовка к сжатию...</div>
            </div>
          )}

          {status === 'compressing' && (
            <div className='space-y-2'>
              <div className='text-blue-200 text-sm'>{getStatusText()}</div>
              <div className='w-full bg-purple-950 rounded-full h-4 overflow-hidden'>
                <div className='bg-blue-400 h-full transition-all duration-300' style={{ width: `${compressionProgress}%` }} />
              </div>
              {jobId && <div className='text-xs text-purple-400'>Job ID: {jobId}</div>}
            </div>
          )}

          {status === 'done' && (
            <div className='p-4 bg-green-900/30 rounded-lg border border-green-500'>
              <div className='text-green-400 font-semibold mb-2'>✅ Файл успешно загружен и обработан!</div>
              <div className='text-sm text-purple-200 mb-3'>Видео добавлено в архив</div>
              <button onClick={resetForm} className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg w-full'>
                Загрузить ещё один файл
              </button>
            </div>
          )}

          {status !== 'done' && (
            <button
              type='submit'
              className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed w-full font-semibold transition-all'
              disabled={isProcessing || !file || !displayName.trim()}
            >
              {isProcessing ? getStatusText() : 'Загрузить'}
            </button>
          )}

          {status === 'idle' && (
            <div className='text-xs text-purple-300 bg-purple-950/50 p-3 rounded-lg'>
              💡 <b>Важно:</b> Во время сжатия вы можете загрузить следующий файл. Файлы обрабатываются в очереди.
            </div>
          )}
        </form>
      </div>

      {/* Files List */}
      <div className='bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm border border-pink-400/20 rounded-2xl shadow-2xl p-8'>
        <h2 className='text-xl font-bold mb-6 text-white'>Управление архивом</h2>

        {files.length === 0 ? (
          <p className='text-purple-300 text-center py-8'>Архив пуст. Загрузите первый файл выше.</p>
        ) : (
          <div className='space-y-3'>
            {files.map((f) => (
              <div
                key={f.id}
                className='flex items-center justify-between bg-purple-950/50 border border-purple-700/50 hover:border-purple-400/40 p-4 rounded-xl transition'
              >
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-1.5'>
                    <h3 className='font-semibold text-white'>{f.displayName}</h3>
                    <button
                      onClick={() => toggleVisibility(f.systemName, f.isPublic)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                        f.isPublic
                          ? 'bg-green-900/50 text-green-400 border border-green-500/40 hover:bg-green-900/70'
                          : 'bg-red-900/50 text-red-400 border border-red-500/40 hover:bg-red-900/70'
                      }`}
                    >
                      {f.isPublic ? '✅ Публичное' : '❌ Скрыто'}
                    </button>
                  </div>
                  <div className='text-xs text-purple-300 flex gap-4'>
                    <span>{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                    <span>{new Date(f.uploadedAt).toLocaleString('ru-RU')}</span>
                    <span>👁️ {f.views}</span>
                  </div>
                </div>
                <div className='flex items-center gap-2 ml-4'>
                  <a
                    href={`/watch-conf/${encodeURIComponent(f.systemName)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition'
                  >
                    Смотреть
                  </a>
                  <button
                    onClick={() => handleDelete(f.systemName, f.displayName)}
                    className='px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm transition'
                  >
                    Удалить
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
