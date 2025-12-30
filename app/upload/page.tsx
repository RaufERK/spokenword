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

  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return (
      <div className='p-10 text-red-600'>
        Нет доступа. Только для модераторов и выше.
      </div>
    )
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

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
      } else if (state === 'completed') {
        setStatus('done')
        setCompressionProgress(100)
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
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
          }, 2000) // Poll every 2 seconds
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

  return (
    <div className='p-10 max-w-2xl mx-auto bg-indigo-800 rounded-2xl shadow'>
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
  )
}
