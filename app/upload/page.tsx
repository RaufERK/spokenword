'use client'

import { useSession } from 'next-auth/react'
import { useState, useRef } from 'react'

export default function UploadPage() {
  const { data } = useSession()
  const role = data?.user?.role

  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return (
      <div className='p-10 text-red-600'>
        Нет доступа. Только для модераторов и выше.
      </div>
    )
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

    const form = new FormData()
    form.append('file', file)
    form.append('displayName', displayName)

    const res = await fetch('/api/conf-archive/upload', {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      setStatus('error')
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Ошибка загрузки')
      return
    }
    setStatus('done')
    setFile(null)
    setDisplayName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className='p-10 max-w-md mx-auto bg-indigo-800 rounded-2xl shadow'>
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
            className='w-full rounded p-2 text-white-900  bg-purple-700'
            disabled={status === 'uploading'}
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
            className='w-full rounded p-2 text-white-900  bg-purple-700'
            disabled={status === 'uploading'}
          />
        </div>
        {error && <div className='text-red-500'>{error}</div>}
        <button
          type='submit'
          className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-60 w-full'
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? 'Загрузка...' : 'Загрузить'}
        </button>
        {status === 'done' && (
          <div className='text-green-400 mt-2'>Файл успешно загружен!</div>
        )}
      </form>
    </div>
  )
}
