// ---------- components/ArchiveList.tsx ---------------------
'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Props {
  canDelete?: boolean
}

export default function ArchiveList({ canDelete }: Props) {
  const [files, setFiles] = useState<string[]>([])
  const fetchFiles = async () => {
    const res = await fetch('/api/archive') // next api route → returns list
    setFiles(await res.json())
  }
  useEffect(() => {
    fetchFiles()
  }, [])

  const handleDelete = async (name: string) => {
    if (!canDelete) return
    if (!confirm(`Удалить ${name}?`)) return
    await fetch(`/api/archive/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    fetchFiles()
  }

  if (!files.length) return <p className='text-gray-500'>Архив пуст</p>

  return (
    <ul className='space-y-2'>
      {files.map((name) => (
        <li
          key={name}
          className='flex items-center justify-between bg-white p-3 rounded shadow text-gray-800'
        >
          <span>{name}</span>
          <div className='space-x-2'>
            <Link
              href={`/archive/${encodeURIComponent(name)}`}
              className='text-blue-600 underline'
            >
              Смотреть
            </Link>
            {canDelete && (
              <button
                onClick={() => handleDelete(name)}
                className='text-red-600 underline'
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
