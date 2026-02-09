'use client'

import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'

type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'compressing'
  | 'done'
  | 'error'

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

export default function UploadPage() {
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Load files list
  useEffect(() => {
    fetchFilesList()
  }, [refreshList])

  const fetchFilesList = async () => {
    try {
      const res = await fetch('/api/conf-archive/list')
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      }
    } catch (err) {
      console.error('Error fetching files list:', err)
    }
  }

  const handleDelete = async (systemName: string, displayName: string) => {
    if (!confirm(`Удалить файл "${displayName}"?`)) return

    try {
      const res = await fetch(`/api/conf-archive/${encodeURIComponent(systemName)}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setFiles(prev => prev.filter(f => f.systemName !== systemName))
        alert('✅ Файл успешно удален')
      } else {
        alert('❌ Ошибка удаления файла')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('❌ Ошибка удаления файла')
    }
  }

  const toggleVisibility = async (systemName: string, currentIsPublic: boolean) => {
    try {
      const res = await fetch(`/api/conf-archive/${encodeURIComponent(systemName)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentIsPublic })
      })

      if (res.ok) {
        setFiles(prev => 
          prev.map(f => 
            f.systemName === systemName 
              ? { ...f, isPublic: !currentIsPublic }
              : f
          )
        )
      } else {
        alert('❌ Ошибка изменения видимости')
      }
    } catch (err) {
      console.error('Toggle visibility error:', err)
      alert('❌ Ошибка изменения видимости')
    }
  }

  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/job-status/${jobId}`)
      if (!res.ok) return

      const data = await res.json()
      const state: JobState = data.state || 'unknown'
      const progress = data.progress || 0

      console.log(`[Job ${jobId}] State: ${state}, Progress: ${progress}`)

      if (state === 'active') {
        setStatus('compressing')
        setCompressionProgress(progress)
        
        // If progress reaches 100% while still active, prepare for completion
        if (progress >= 100) {
          console.log('[Job] Progress reached 100%, waiting for completion...')
        }
      } else if (state === 'completed') {
        console.log('[Job] ✅ Completed!')
        setStatus('done')
        setCompressionProgress(100)
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        // Refresh files list
        setRefreshList(prev => prev + 1)
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
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
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

    // Use XMLHttpRequest for upload progress tracking
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setUploadProgress(percent)
        console.log(`Upload progress: ${percent}%`)
      }
    })

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText)
        console.log('Upload response:', data)

        setUploadProgress(100)
        setStatus('processing')

        // Start polling for compression status
        if (data.jobId) {
          setJobId(data.jobId)
          pollIntervalRef.current = setInterval(() => {
            pollJobStatus(data.jobId)
          }, 1000) // Poll every 1 second for faster updates
        } else {
          // No compression job (e.g., file moved directly)
          setStatus('done')
          setFile(null)
          setDisplayName('')
          if (fileInputRef.current) fileInputRef.current.value = ''
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

    xhr.open('POST', '/api/conf-archive/upload')
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
      case 'uploading':
        return `Загрузка файла... ${uploadProgress}%`
      case 'processing':
        return 'Обработка файла...'
      case 'compressing':
        return `Сжатие видео... ${compressionProgress}%`
      case 'done':
        return 'Готово!'
      case 'error':
        return 'Ошибка'
      default:
        return ''
    }
  }

  const isProcessing = ['uploading', 'processing', 'compressing'].includes(status)

  // Check access after all hooks
  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return (
      <div className='p-10 text-red-600'>
        Нет доступа. Только для модераторов и выше.
      </div>
    )
  }

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-8'>
      {/* Upload Form */}
      <div className='bg-indigo-800 rounded-2xl shadow p-8'>
        <h1 className='text-2xl mb-6 font-bold text-center text-blue-500'>
          Загрузка файла в архив конференции
        </h1>
        <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-blue-300 mb-1'>
            Название файла для архива:
          </label>
          <input
            type='text'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className='w-full rounded p-2 text-white-900 bg-purple-700'
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className='block text-blue-300 mb-1'>
            Файл (только .mp4):
          </label>
          <input
            type='file'
            accept='video/mp4'
            ref={fileInputRef}
            onChange={handleFileChange}
            className='w-full rounded p-2 text-white-900 bg-purple-700'
            disabled={isProcessing}
          />
          {file && (
            <div className='text-xs text-gray-300 mt-1'>
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} МБ)
            </div>
          )}
        </div>

        {error && <div className='text-red-500 p-3 bg-red-900/30 rounded'>{error}</div>}

        {/* Upload Progress */}
        {status === 'uploading' && (
          <div className='space-y-2'>
            <div className='text-blue-300 text-sm'>{getStatusText()}</div>
            <div className='w-full bg-gray-700 rounded-full h-4 overflow-hidden'>
              <div
                className='bg-blue-500 h-full transition-all duration-300'
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Processing Status */}
        {status === 'processing' && (
          <div className='space-y-2'>
            <div className='text-yellow-300 text-sm animate-pulse'>
              {getStatusText()}
            </div>
            <div className='text-xs text-gray-400'>
              Проверка кодека и подготовка к сжатию...
            </div>
          </div>
        )}

        {/* Compression Progress */}
        {status === 'compressing' && (
          <div className='space-y-2'>
            <div className='text-purple-300 text-sm'>{getStatusText()}</div>
            <div className='w-full bg-gray-700 rounded-full h-4 overflow-hidden'>
              <div
                className='bg-purple-500 h-full transition-all duration-300'
                style={{ width: `${compressionProgress}%` }}
              />
            </div>
            {jobId && (
              <div className='text-xs text-gray-400'>Job ID: {jobId}</div>
            )}
          </div>
        )}

        {/* Success Message */}
        {status === 'done' && (
          <div className='p-4 bg-green-900/30 rounded border border-green-500'>
            <div className='text-green-400 font-semibold mb-2'>
              ✅ Файл успешно загружен и обработан!
            </div>
            <div className='text-sm text-gray-300 mb-3'>
              Видео добавлено в архив конференций
            </div>
            <button
              onClick={resetForm}
              className='bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full'
            >
              Загрузить ещё один файл
            </button>
          </div>
        )}

        {/* Submit Button */}
        {status !== 'done' && (
          <button
            type='submit'
            className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed w-full font-semibold'
            disabled={isProcessing || !file || !displayName.trim()}
          >
            {isProcessing ? getStatusText() : 'Загрузить'}
          </button>
        )}

        {/* Info Message */}
        {status === 'idle' && (
          <div className='text-xs text-gray-400 bg-gray-800/50 p-3 rounded'>
            💡 <b>Важно:</b> Во время сжатия вы можете загрузить следующий файл.
            Файлы обрабатываются в очереди.
          </div>
        )}
      </form>
      </div>

      {/* Files List */}
      <div className='bg-white rounded-2xl shadow p-8'>
        <h2 className='text-2xl font-bold mb-6 text-gray-800'>
          Управление архивом конференций
        </h2>

        {files.length === 0 ? (
          <p className='text-gray-500 text-center py-8'>
            Архив пуст. Загрузите первый файл выше.
          </p>
        ) : (
          <div className='space-y-3'>
            {files.map((f) => (
              <div
                key={f.id}
                className='flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition'
              >
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-2'>
                    <h3 className='font-semibold text-gray-900'>{f.displayName}</h3>
                    <button
                      onClick={() => toggleVisibility(f.systemName, f.isPublic)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                        f.isPublic
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {f.isPublic ? '✅ ПОКАЗЫВАЕТСЯ ВСЕМ' : '❌ НЕ ВИДНО ВСЕМ'}
                    </button>
                  </div>
                  <div className='text-sm text-gray-600 space-x-4'>
                    <span>📊 {(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                    <span>📅 {new Date(f.uploadedAt).toLocaleString('ru-RU')}</span>
                    <span>👁️ {f.views} просмотров</span>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
                  <a
                    href={`/watch-conf/${encodeURIComponent(f.systemName)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition'
                  >
                    Смотреть
                  </a>
                  <button
                    onClick={() => handleDelete(f.systemName, f.displayName)}
                    className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition'
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
