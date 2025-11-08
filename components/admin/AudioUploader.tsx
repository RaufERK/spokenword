'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  packageId: number
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'compressing' | 'completed' | 'error'
  error?: string
}

export default function AudioUploader({ packageId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Фильтруем только видео файлы
    const videoFiles = files.filter(file => file.type.startsWith('video/'))
    
    if (videoFiles.length !== files.length) {
      alert('Можно загружать только видео файлы')
    }

    if (videoFiles.length > 0) {
      uploadFiles(videoFiles)
    }
  }

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    
    // Инициализируем прогресс для каждого файла
    const initialProgress: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }))
    setUploads(initialProgress)

    // Загружаем файлы по одному
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        await uploadSingleFile(file, i)
      } catch (error) {
        setUploads(prev => prev.map((upload, index) => 
          index === i 
            ? { ...upload, status: 'error', error: 'Ошибка загрузки' }
            : upload
        ))
      }
    }

    setIsUploading(false)
    
    // Обновляем страницу через 2 секунды
    setTimeout(() => {
      router.refresh()
    }, 2000)
  }

  const uploadSingleFile = async (file: File, index: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('packageId', packageId.toString())

    // Симулируем прогресс загрузки
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, progress: 30 } : upload
    ))

    const response = await fetch('/api/admin/packages/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    // Симулируем прогресс сжатия
    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, progress: 60, status: 'compressing' } : upload
    ))

    // Ждем ответ (в реальности здесь будет WebSocket или polling)
    await new Promise(resolve => setTimeout(resolve, 2000))

    setUploads(prev => prev.map((upload, i) => 
      i === index ? { ...upload, progress: 100, status: 'completed' } : upload
    ))
  }

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'Загрузка...'
      case 'compressing': return 'Сжатие...'
      case 'completed': return 'Готово!'
      case 'error': return 'Ошибка'
      default: return ''
    }
  }

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-600'
      case 'compressing': return 'text-yellow-600'
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Загрузить новые лекции</h2>
      
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
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
          {isUploading ? 'Загрузка...' : 'Выбрать видео файлы'}
        </button>
        
        <p className="text-sm text-gray-500 mt-2">
          Поддерживаются форматы: MP4, AVI, MOV, MKV. 
          Видео будет сжато до 720p для экономии места.
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Прогресс загрузки:</h3>
          {uploads.map((upload, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium truncate">{upload.fileName}</span>
                <span className={`text-sm ${getStatusColor(upload.status)}`}>
                  {getStatusText(upload.status)}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    upload.status === 'error' ? 'bg-red-500' : 
                    upload.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              
              {upload.error && (
                <p className="text-red-600 text-sm mt-1">{upload.error}</p>
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
