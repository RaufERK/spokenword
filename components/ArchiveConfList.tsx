'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlayCircle, Trash2, Calendar, Eye } from 'lucide-react'

type ConfFile = {
  id: number
  displayName: string
  systemName: string
  size: number
  uploadedAt: string
  views: number
  isPublic: boolean
}

export default function ArchiveConfList({
  canDelete = false,
  showAll = false,
}: {
  canDelete?: boolean
  showAll?: boolean
}) {
  const [files, setFiles] = useState<ConfFile[]>([])

  useEffect(() => {
    fetch('/api/conf-archive/list')
      .then((res) => res.json())
      .then((data: ConfFile[]) => {
        const filtered = showAll ? data : data.filter((f) => f.isPublic)
        setFiles(filtered)
      })
  }, [showAll])

  if (!files.length)
    return (
      <p className='text-purple-300 text-center py-8'>Архив конференций пуст</p>
    )

  return (
    <ul className='space-y-3'>
      {files.map((f) => (
        <li
          key={f.id}
          className='flex items-center justify-between bg-purple-900/40 backdrop-blur-sm border border-white/10 hover:border-blue-400/40 p-4 rounded-xl transition-all'
        >
          <div className='flex-1 min-w-0'>
            <p className='font-semibold text-white truncate'>{f.displayName}</p>
            <div className='flex flex-wrap gap-3 mt-1 text-xs text-purple-300'>
              <span className='flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                {new Date(f.uploadedAt).toLocaleDateString('ru-RU')}
              </span>
              <span className='flex items-center gap-1'>
                <Eye className='w-3 h-3' />
                {f.views}
              </span>
              <span className='text-blue-300'>
                {(f.size / 1024 / 1024).toFixed(1)} МБ
              </span>
              {canDelete && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    f.isPublic
                      ? 'bg-green-900/50 text-green-400 border border-green-500/30'
                      : 'bg-red-900/50 text-red-400 border border-red-500/30'
                  }`}
                >
                  {f.isPublic ? 'Публичное' : 'Скрыто'}
                </span>
              )}
            </div>
          </div>

          <div className='flex items-center gap-2 ml-4 flex-shrink-0'>
            <Link
              href={`/watch-conf/${encodeURIComponent(f.systemName)}`}
              className='flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors'
              prefetch={false}
              target='_blank'
            >
              <PlayCircle className='w-4 h-4' />
              <span>Смотреть</span>
            </Link>
            {canDelete && (
              <button
                className='p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors'
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
                <Trash2 className='w-4 h-4' />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
