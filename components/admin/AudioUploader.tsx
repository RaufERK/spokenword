'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  packageId: number
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'compressing' | 'completed' | 'error'
type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'unknown'

interface UploadProgress {
  fileName: string
  uploadProgress: number
  compressionProgress: number
  status: UploadStatus
  error?: string
  jobId?: string
}

export default function AudioUploader({ packageId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

  // Auto-refresh page when upload completes
  useEffect(() => {
    const hasCompleted = uploads.some(u => u.status === 'completed')
    if (hasCompleted && !isUploading) {
      // Small delay to ensure DB is updated
      const timer = setTimeout(() => {
        router.refresh()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [uploads, isUploading, router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const file = files[0]
    
    if (!file.type.startsWith('video/')) {
      alert('Можно загружать только видео файлы')
      return
    }

    uploadFiles([file])
  }

  // Poll job status for compression progress
  const pollJobStatus = async (jobId: string, fileIndex: number) => {
    try {
      const res = await fetch(`/api/job-status/${jobId}`)
      if (!res.ok) return

      const data = await res.json()
      const state: JobState = data.state || 'unknown'
      const progress = data.progress || 0

      console.log(`[Package Upload Job ${jobId}] State: ${state}, Progress: ${progress}`)

      setUploads(prev => prev.map((upload, i) => {
        if (i !== fileIndex) return upload
        
        if (state === 'active') {
          return {
            ...upload,
            status: 'compressing',
            compressionProgress: progress
          }
        } else if (state === 'completed') {
          console.log('[Package Upload Job] ✅ Completed!')
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          return {
            ...upload,
            status: 'completed',
            compressionProgress: 100
          }
        } else if (state === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          return {
            ...upload,
            status: 'error',
            error: data.error || 'Ошибка компрессии'
          }
        }
        return upload
      }))
    } catch (err) {
      console.error('Error polling job status:', err)
    }
  }

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    
    // Инициализируем прогресс для каждого файла
    const initialProgress: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      uploadProgress: 0,
      compressionProgress: 0,
      status: 'uploading'
    }))
    setUploads(initialProgress)

    // Загружаем файлы по одному
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        await uploadSingleFile(file, i)
      } catch (err) {
        console.error('Upload error:', err)
        setUploads(prev => prev.map((upload, index) => 
          index === i 
            ? { ...upload, status: 'error', error: 'Ошибка загрузки' }
            : upload
        ))
      }
    }

    setIsUploading(false)
  }

  const uploadSingleFile = async (file: File, index: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      // IMPORTANT: packageId must come BEFORE file for busboy to parse it first
      formData.append('packageId', packageId.toString())
      formData.append('file', file)

      // Use XMLHttpRequest for real upload progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { ...upload, uploadProgress: percent } : upload
          ))
          console.log(`[Package Upload] Upload progress: ${percent}%`)
        }
      })

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          console.log('Package upload response:', data)

          setUploads(prev => prev.map((upload, i) => 
            i === index ? { 
              ...upload, 
              uploadProgress: 100, 
              status: 'processing' 
            } : upload
          ))

          // Start polling for compression status
          if (data.jobId) {
            setUploads(prev => prev.map((upload, i) => 
              i === index ? { ...upload, jobId: data.jobId } : upload
            ))
            
            pollIntervalRef.current = setInterval(() => {
              pollJobStatus(data.jobId, index)
            }, 1000) // Poll every 1 second

            // Wait for completion before resolving
            const checkCompletion = setInterval(() => {
              setUploads(current => {
                const upload = current[index]
                if (upload.status === 'completed' || upload.status === 'error') {
                  clearInterval(checkCompletion)
                  
                  if (upload.status === 'completed') {
                    resolve()
                  } else {
                    reject(new Error(upload.error))
                  }
                }
                return current
              })
            }, 500)
          } else {
            // No compression job
            setUploads(prev => prev.map((upload, i) => 
              i === index ? { ...upload, status: 'completed' } : upload
            ))
            resolve()
          }
        } else {
          const data = JSON.parse(xhr.responseText || '{}')
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { 
              ...upload, 
              status: 'error', 
              error: data.error || 'Ошибка загрузки' 
            } : upload
          ))
          reject(new Error(data.error || 'Upload failed'))
        }
      })

      xhr.addEventListener('error', () => {
        setUploads(prev => prev.map((upload, i) => 
          i === index ? { 
            ...upload, 
            status: 'error', 
            error: 'Ошибка сети' 
          } : upload
        ))
        reject(new Error('Network error'))
      })

      xhr.open('POST', '/api/admin/packages/upload')
      xhr.send(formData)
    })
  }

  const getStatusText = (upload: UploadProgress) => {
    switch (upload.status) {
      case 'uploading': 
        return `Загрузка... ${upload.uploadProgress}%`
      case 'processing':
        return 'Обработка файла...'
      case 'compressing': 
        return `Сжатие... ${upload.compressionProgress}%`
      case 'completed': 
        return '✅ Готово!'
      case 'error': 
        return '❌ Ошибка'
      default: 
        return ''
    }
  }

  const getStatusColor = (status: UploadStatus) => {
    switch (status) {
      case 'uploading': return 'text-blue-600'
      case 'processing': return 'text-yellow-600'
      case 'compressing': return 'text-purple-600'
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getProgressValue = (upload: UploadProgress) => {
    if (upload.status === 'uploading') {
      return upload.uploadProgress
    } else if (upload.status === 'compressing') {
      return upload.compressionProgress
    } else if (upload.status === 'completed') {
      return 100
    }
    return 0
  }

  const getProgressColor = (status: UploadStatus) => {
    switch (status) {
      case 'uploading': return 'bg-blue-500'
      case 'processing': return 'bg-yellow-500'
      case 'compressing': return 'bg-purple-500'
      case 'completed': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Загрузить новые лекции</h2>
      
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Загрузка...' : 'Выбрать видео файл'}
        </button>
        
        <p className="text-sm text-gray-500 mt-2">
          ⚠️ Загружайте по одному файлу за раз для стабильной работы.
          Поддерживаются форматы: MP4, AVI, MOV, MKV.
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Прогресс загрузки:</h3>
          {uploads.map((upload, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium truncate max-w-[70%]">{upload.fileName}</span>
                <span className={`text-sm font-semibold ${getStatusColor(upload.status)}`}>
                  {getStatusText(upload)}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(upload.status)}`}
                  style={{ width: `${getProgressValue(upload)}%` }}
                />
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                {upload.status === 'uploading' && (
                  <div>📤 Загрузка на сервер: {upload.uploadProgress}%</div>
                )}
                {upload.status === 'processing' && (
                  <div className="animate-pulse">⚙️ Проверка кодека и подготовка к сжатию...</div>
                )}
                {upload.status === 'compressing' && (
                  <div>🎬 Сжатие видео до 720p: {upload.compressionProgress}%</div>
                )}
                {upload.status === 'completed' && (
                  <div className="text-green-700">✓ Видео успешно добавлено в пакет</div>
                )}
                {upload.jobId && upload.status !== 'completed' && (
                  <div className="text-gray-400">Job ID: {upload.jobId}</div>
                )}
              </div>
              
              {upload.error && (
                <p className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {uploads.some(u => u.status === 'completed') && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-green-800 text-sm">
            ✅ Видео успешно загружены и сжаты до 720p! Страница обновится автоматически.
          </p>
        </div>
      )}
    </div>
  )
}
