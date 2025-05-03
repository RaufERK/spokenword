// src/app/archive/page.tsx
'use client'

import { useEffect, useState } from 'react'

type ArchiveEntry = {
  name: string
  url: string
  size: number
  modified: string
}

export default function ArchivePage() {
  const [files, setFiles] = useState<ArchiveEntry[]>([])
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/archive')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.files)) {
          setFiles(data.files)
        }
      })
      .catch((err) => {
        console.error('Ошибка загрузки архива:', err)
      })
  }, [])

  const handleDelete = async (name: string) => {
    if (!confirm(`Удалить ${name}?`)) return
    await fetch(`/api/archive/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  return (
    <div className='p-4'>
      <h1 className='text-2xl mb-4'>Архив трансляций</h1>

      {files.length === 0 ? (
        <p className='text-gray-500'>Архив пуст или не загружен.</p>
      ) : (
        <ul className='mb-6 space-y-2'>
          {files.map((file) => (
            <li
              key={file.name}
              className='flex justify-between items-center border p-2 rounded hover:bg-gray-50'
            >
              <div>
                <p className='font-medium'>{file.name}</p>
                <p className='text-sm text-gray-500'>
                  {new Date(file.modified).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedUrl(file.url)}
                className='px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
              >
                Смотреть
              </button>
              <button
                onClick={() => handleDelete(file.name)}
                className='ml-2 rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600'
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedUrl && (
        <div className='mt-6'>
          <h2 className='text-xl mb-2'>Просмотр записи</h2>
          <video
            src={selectedUrl}
            controls
            className='w-full max-w-3xl mx-auto'
          />
        </div>
      )}
    </div>
  )
}
