// components/ArchiveList.tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/* ── 1. Локализованный вид «Среда 4 июня 22:28» ───────────────────── */
const fmt = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/* ── 2. YYYY-MM-DD_HH-MM-SS.mp4 → Date | null ─────────────────────── */
function nameToDate(name: string): Date | null {
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`)
}

interface Props {
  canDelete?: boolean
}

export default function ArchiveList({ canDelete }: Props) {
  const [files, setFiles] = useState<string[]>([])

  const fetchFiles = async () => {
    const result = await fetch('/api/archive')
    setFiles(await result.json())
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
      {files.map((name) => {
        const dt = nameToDate(name)
        return (
          <li
            key={name}
            className='flex items-center justify-between bg-white p-3 rounded shadow text-gray-800'
          >
            <span>
              {dt
                ? fmt.format(dt).replace(/^\w/u, (c) => c.toUpperCase())
                : name}
            </span>

            <div className='space-x-2'>
              {/* страница-плеер теперь /watch/[name] */}
              <Link
                href={`/watch/${encodeURIComponent(name)}`}
                className='text-blue-600 underline'
                prefetch
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
        )
      })}
    </ul>
  )
}
