// components/ArchiveConfList.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ConfFile = {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
}

export default function ArchiveConfList({
  canDelete = false,
}: {
  canDelete?: boolean
}) {
  const [files, setFiles] = useState<ConfFile[]>([])

  useEffect(() => {
    fetch('/api/conf-archive/list')
      .then((res) => res.json())
      .then(setFiles)
  }, [])

  if (!files.length)
    return <p className='text-gray-500'>Архив конференций пуст</p>

  return (
    <ul className='space-y-2'>
      {files.map((f) => (
        <li
          key={f.id}
          className='flex items-center justify-between bg-white p-3 rounded shadow text-gray-800'
        >
          <span>
            <b>{f.displayName}</b>
            <span className='ml-3 text-xs text-gray-400'>
              ({(f.size / 1024 / 1024).toFixed(1)} МБ,{' '}
              {new Date(f.uploadedAt).toLocaleString('ru-RU')})
            </span>
          </span>
          <div className='space-x-2'>
            <Link
              href={`/watch-conf/${encodeURIComponent(f.systemName)}`}
              className='text-blue-600 underline'
              prefetch={false}
              target='_blank'
            >
              Смотреть
            </Link>
            {canDelete && (
              <button
                className='text-red-600 underline'
                onClick={async () => {
                  if (!confirm(`Удалить файл ${f.displayName}?`)) return
                  const res = await fetch(
                    `/api/conf-archive/${encodeURIComponent(f.systemName)}`,
                    { method: 'DELETE' }
                  )
                  if (res.ok) {
                    setFiles((files) =>
                      files.filter((x) => x.systemName !== f.systemName)
                    )
                  } else {
                    alert('Ошибка удаления файла')
                  }
                }}
              >
                Удалить
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
