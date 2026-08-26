'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Headphones, Trash2, Upload } from 'lucide-react'

type Category = { id: number; name: string; slug: string }

type Lecture = {
  id: number
  title: string
  year: number | null
  description: string | null
  originalName: string
  systemName: string
  size: number
  durationSec: number | null
  isPublished: boolean
  uploadedAt: string
  categories: Category[]
}

type Slot = {
  id: number
  startsAt: string
  status: string
  errorLog: string | null
  lecture: { id: number; title: string; durationSec: number | null }
}

function formatMinutes(durationSec: number | null) {
  if (durationSec == null || durationSec <= 0) return '—'
  return `${Math.max(1, Math.round(durationSec / 60))} мин`
}

function formatMoscow(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
}

const SLOT_STATUS: Record<string, string> = {
  SCHEDULED: 'запланирован',
  PLAYING: 'в эфире',
  DONE: 'завершён',
  SKIPPED_LIVE: 'пропущен: живой эфир',
  FAILED: 'ошибка',
}

export default function AdminAudioLibraryPage() {
  const { data: session, status } = useSession()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [slotLectureId, setSlotLectureId] = useState('')
  const [slotStartsAt, setSlotStartsAt] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const role = session?.user?.role
  const allowed = role && ['MODERATOR', 'ADMIN', 'SUPER'].includes(role)

  const load = async () => {
    const [libraryRes, slotsRes] = await Promise.all([
      fetch('/api/admin/audio-library'),
      fetch('/api/admin/audio-library/slots'),
    ])
    const library = await libraryRes.json()
    const slotsResult = await slotsRes.json()
    if (library.success) {
      setLectures(library.data.lectures)
      setCategories(library.data.categories)
    }
    if (slotsResult.success) setSlots(slotsResult.data)
  }

  useEffect(() => {
    if (allowed) load()
  }, [allowed])

  if (status === 'loading') {
    return <div className='text-white p-6'>Загрузка...</div>
  }

  if (!allowed) {
    return <div className='p-10 text-red-400'>Нет доступа.</div>
  }

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setMessage('Выберите аудиофайл')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title.trim() || file.name)
    if (year.trim()) formData.append('year', year.trim())

    setUploading(true)
    setUploadProgress(0)
    setMessage('')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/audio-library/upload')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = async () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        setTitle('')
        setYear('')
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setMessage('Файл загружен')
        await load()
      } else {
        try {
          const result = JSON.parse(xhr.responseText)
          setMessage(result.error || 'Ошибка загрузки')
        } catch {
          setMessage('Ошибка загрузки')
        }
      }
    }
    xhr.onerror = () => {
      setUploading(false)
      setMessage('Ошибка загрузки')
    }
    xhr.send(formData)
  }

  const handleCreateCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    const res = await fetch('/api/admin/audio-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const result = await res.json()
    if (res.ok) {
      setNewCategory('')
      await load()
    } else {
      setMessage(result.error || 'Не удалось создать категорию')
    }
  }

  const handleTogglePublished = async (lecture: Lecture) => {
    const res = await fetch(`/api/admin/audio-library/${lecture.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !lecture.isPublished }),
    })
    if (res.ok) await load()
  }

  const handleToggleCategory = async (lecture: Lecture, categoryId: number) => {
    const categoryIds = lecture.categories.some((category) => category.id === categoryId)
      ? lecture.categories.filter((category) => category.id !== categoryId).map((category) => category.id)
      : [...lecture.categories.map((category) => category.id), categoryId]
    const res = await fetch(`/api/admin/audio-library/${lecture.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds }),
    })
    if (res.ok) await load()
  }

  const handleDelete = async (lecture: Lecture) => {
    if (!confirm(`Удалить «${lecture.title}»?`)) return
    const res = await fetch(`/api/admin/audio-library/${lecture.id}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
    } else {
      const result = await res.json()
      setMessage(result.error || 'Не удалось удалить')
    }
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/audio-library/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lectureId: slotLectureId, startsAt: slotStartsAt }),
    })
    const result = await res.json()
    if (res.ok) {
      setSlotLectureId('')
      setSlotStartsAt('')
      setMessage('Эфир запланирован')
      await load()
    } else {
      setMessage(result.error === 'Slot overlaps another broadcast'
        ? 'Это время пересекается с другим эфиром'
        : result.error || 'Не удалось запланировать')
    }
  }

  const handleCancelSlot = async (slot: Slot) => {
    if (!confirm(`Отменить эфир «${slot.lecture.title}»?`)) return
    const res = await fetch(`/api/admin/audio-library/slots/${slot.id}`, { method: 'DELETE' })
    if (res.ok) await load()
    else {
      const result = await res.json()
      setMessage(result.error || 'Не удалось отменить')
    }
  }

  return (
    <div className='max-w-5xl mx-auto space-y-8'>
      <div className='flex items-center gap-3'>
        <Headphones className='w-8 h-8 text-pink-300' />
        <div>
          <h1 className='text-2xl font-bold text-white'>Аудиобиблиотека</h1>
          <p className='text-pink-200 text-sm'>Загрузка лекций для audio.spoken-word.ru</p>
        </div>
      </div>

      <form
        onSubmit={handleUpload}
        className='bg-white/10 border border-pink-400/20 rounded-2xl p-6 space-y-4'
      >
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='text-sm text-pink-100'>
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className='mt-1 w-full rounded-lg px-3 py-2 text-gray-900'
              placeholder='Название лекции'
            />
          </label>
          <label className='text-sm text-pink-100'>
            Год
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className='mt-1 w-full rounded-lg px-3 py-2 text-gray-900'
              placeholder='2026'
            />
          </label>
        </div>
        <label className='block text-sm text-pink-100'>
          Файл (mp3, m4a, ogg, wav, до 500MB)
          <input
            ref={fileInputRef}
            type='file'
            accept='.mp3,.m4a,.ogg,.wav,audio/*'
            className='mt-1 block w-full text-white'
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {uploading && (
          <div className='text-pink-100 text-sm'>Загрузка: {uploadProgress}%</div>
        )}
        <button
          type='submit'
          disabled={uploading}
          className='inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg'
        >
          <Upload className='w-4 h-4' />
          Загрузить
        </button>
        {message && <p className='text-pink-100 text-sm'>{message}</p>}
      </form>

      <div className='bg-white/10 border border-pink-400/20 rounded-2xl p-6 space-y-3'>
        <h2 className='text-white font-semibold'>Категории</h2>
        <div className='flex gap-2'>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className='flex-1 rounded-lg px-3 py-2 text-gray-900'
            placeholder='Новая категория'
          />
          <button
            type='button'
            onClick={handleCreateCategory}
            className='bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg'
          >
            Добавить
          </button>
        </div>
        <div className='flex flex-wrap gap-2 text-sm text-pink-100'>
          {categories.length === 0 ? 'Пока нет' : categories.map((category) => (
            <span key={category.id} className='bg-white/10 px-2 py-1 rounded'>
              {category.name}
            </span>
          ))}
        </div>
      </div>

      <form
        onSubmit={handleCreateSlot}
        className='bg-white/10 border border-pink-400/20 rounded-2xl p-6 space-y-4'
      >
        <h2 className='text-white font-semibold'>Плановый эфир (Москва)</h2>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='text-sm text-pink-100'>
            Лекция
            <select
              value={slotLectureId}
              onChange={(e) => setSlotLectureId(e.target.value)}
              required
              className='mt-1 w-full rounded-lg px-3 py-2 text-gray-900'
            >
              <option value=''>Выберите лекцию</option>
              {lectures.map((lecture) => (
                <option key={lecture.id} value={lecture.id}>
                  {lecture.title}
                </option>
              ))}
            </select>
          </label>
          <label className='text-sm text-pink-100'>
            Дата и время
            <input
              type='datetime-local'
              value={slotStartsAt}
              onChange={(e) => setSlotStartsAt(e.target.value)}
              required
              className='mt-1 w-full rounded-lg px-3 py-2 text-gray-900'
            />
          </label>
        </div>
        <button type='submit' className='bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg'>
          Запланировать
        </button>
        <div className='space-y-2'>
          {slots.length === 0 && <p className='text-pink-200 text-sm'>Слотов пока нет.</p>}
          {slots.map((slot) => (
            <div key={slot.id} className='flex flex-wrap items-center justify-between gap-2 bg-white/10 rounded-lg px-3 py-2 text-sm text-white'>
              <span>
                {formatMoscow(slot.startsAt)} · {slot.lecture.title} · {SLOT_STATUS[slot.status] || slot.status}
                {slot.errorLog ? ` · ${slot.errorLog}` : ''}
              </span>
              {slot.status === 'SCHEDULED' && (
                <button type='button' onClick={() => handleCancelSlot(slot)} className='text-pink-200 hover:text-white'>
                  Отменить
                </button>
              )}
            </div>
          ))}
        </div>
      </form>

      <div className='space-y-3'>
        {lectures.length === 0 && (
          <p className='text-pink-200'>Лекций пока нет.</p>
        )}
        {lectures.map((lecture) => (
          <div
            key={lecture.id}
            className='bg-white/10 border border-pink-400/20 rounded-xl p-4 text-white'
          >
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='font-semibold'>{lecture.title}</div>
                <div className='text-sm text-pink-200'>
                  {lecture.year ?? 'без года'} · {formatMinutes(lecture.durationSec)} · {lecture.originalName}
                </div>
              </div>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => handleTogglePublished(lecture)}
                  className='bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm'
                >
                  {lecture.isPublished ? 'Опубликована' : 'Скрыта'}
                </button>
                <button
                  type='button'
                  onClick={() => handleDelete(lecture)}
                  className='bg-red-700/80 hover:bg-red-700 px-3 py-1 rounded-lg text-sm inline-flex items-center gap-1'
                >
                  <Trash2 className='w-4 h-4' />
                  Удалить
                </button>
              </div>
            </div>
            {categories.length > 0 && (
              <div className='mt-3 flex flex-wrap gap-2'>
                {categories.map((category) => {
                  const checked = lecture.categories.some((item) => item.id === category.id)
                  return (
                    <label key={category.id} className='text-sm text-pink-100 inline-flex items-center gap-1'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => handleToggleCategory(lecture, category.id)}
                      />
                      {category.name}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
