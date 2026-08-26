'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Headphones, Music, Trash2, Upload } from 'lucide-react'

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

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.ogg', '.wav'])
const MAX_AUDIO_BYTES = 500 * 1024 * 1024

const FIELD_CLASS =
  'mt-1 w-full rounded-lg px-3 py-2.5 text-sm text-white bg-purple-950/50 border border-purple-400/30 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500'
const CARD_CLASS =
  'bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm border border-pink-400/20 rounded-2xl shadow-2xl p-6 space-y-4'

function formatMinutes(durationSec: number | null) {
  if (durationSec == null || durationSec <= 0) return '—'
  return `${Math.max(1, Math.round(durationSec / 60))} мин`
}

function formatMoscow(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

function audioExtension(name: string) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

function isAllowedAudio(file: File) {
  return AUDIO_EXT.has(audioExtension(file.name)) || file.type.startsWith('audio/')
}

function titleFromFile(file: File) {
  return file.name.replace(/\.[^.]+$/, '').trim()
}

function uploadUrl() {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3006/upload/audio-library'
  }
  return '/api/audio-library/upload'
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
  const [dragging, setDragging] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [slotLectureId, setSlotLectureId] = useState('')
  const [slotStartsAt, setSlotStartsAt] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'ok' | 'error'>('ok')
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

  const flash = (text: string, kind: 'ok' | 'error' = 'ok') => {
    setMessage(text)
    setMessageKind(kind)
  }

  const pickFile = (next: File | null) => {
    if (!next) return
    if (!isAllowedAudio(next)) {
      flash('Можно загружать только mp3, m4a, ogg, wav', 'error')
      return
    }
    if (next.size > MAX_AUDIO_BYTES) {
      flash('Файл больше 500 МБ', 'error')
      return
    }
    setFile(next)
    if (!title.trim()) setTitle(titleFromFile(next))
    flash('')
  }

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      flash('Выберите аудиофайл', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title.trim() || titleFromFile(file))
    if (year.trim()) formData.append('year', year.trim())

    setUploading(true)
    setUploadProgress(0)
    flash('')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadUrl())
    xhr.withCredentials = true
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
        flash('Файл загружен')
        await load()
      } else {
        try {
          const result = JSON.parse(xhr.responseText)
          flash(result.error || 'Ошибка загрузки', 'error')
        } catch {
          flash('Ошибка загрузки', 'error')
        }
      }
    }
    xhr.onerror = () => {
      setUploading(false)
      flash('Ошибка загрузки', 'error')
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
      flash(result.error || 'Не удалось создать категорию', 'error')
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
      flash(result.error || 'Не удалось удалить', 'error')
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
      flash('Эфир запланирован')
      await load()
    } else {
      flash(
        result.error === 'Slot overlaps another broadcast'
          ? 'Это время пересекается с другим эфиром'
          : result.error || 'Не удалось запланировать',
        'error'
      )
    }
  }

  const handleCancelSlot = async (slot: Slot) => {
    if (!confirm(`Отменить эфир «${slot.lecture.title}»?`)) return
    const res = await fetch(`/api/admin/audio-library/slots/${slot.id}`, { method: 'DELETE' })
    if (res.ok) await load()
    else {
      const result = await res.json()
      flash(result.error || 'Не удалось отменить', 'error')
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

      <form onSubmit={handleUpload} className={CARD_CLASS}>
        <h2 className='text-white font-semibold'>Загрузить лекцию</h2>

        <div
          className={`relative rounded-xl border-2 border-dashed transition-colors ${
            dragging
              ? 'border-pink-400 bg-pink-500/20'
              : file
                ? 'border-green-400/50 bg-green-900/20'
                : 'border-pink-400/40 bg-purple-950/40 hover:border-pink-300/70 hover:bg-purple-950/60'
          }`}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pickFile(e.dataTransfer.files?.[0] ?? null)
          }}
        >
          <input
            ref={fileInputRef}
            type='file'
            accept='.mp3,.m4a,.ogg,.wav,audio/*'
            disabled={uploading}
            className='absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 text-[100px] disabled:cursor-not-allowed'
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <div className='pointer-events-none flex flex-col items-center gap-2 px-4 py-10 text-center'>
            {file ? (
              <>
                <Music className='h-8 w-8 text-green-300' />
                <p className='text-white font-medium'>{file.name}</p>
                <p className='text-sm text-pink-200'>{formatSize(file.size)} · нажмите или перетащите, чтобы заменить</p>
              </>
            ) : (
              <>
                <Upload className='h-8 w-8 text-pink-300' />
                <p className='text-white font-medium'>Выберите аудиофайл или перетащите сюда</p>
                <p className='text-sm text-pink-200'>mp3, m4a, ogg, wav · до 500 МБ</p>
              </>
            )}
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <label className='text-sm text-pink-100'>
            Название
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={FIELD_CLASS}
              placeholder='Название лекции'
              disabled={uploading}
            />
          </label>
          <label className='text-sm text-pink-100'>
            Год
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={FIELD_CLASS}
              placeholder='2026'
              inputMode='numeric'
              disabled={uploading}
            />
          </label>
        </div>

        {uploading && (
          <div className='space-y-2'>
            <div className='text-pink-100 text-sm'>Загрузка: {uploadProgress}%</div>
            <div className='h-3 w-full overflow-hidden rounded-full bg-purple-950'>
              <div
                className='h-full bg-pink-500 transition-all duration-300'
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type='submit'
          disabled={uploading || !file}
          className='inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg'
        >
          <Upload className='w-4 h-4' />
          {uploading ? `Загрузка ${uploadProgress}%` : 'Загрузить'}
        </button>
        {message && (
          <p className={`text-sm ${messageKind === 'error' ? 'text-red-300' : 'text-green-300'}`}>
            {message}
          </p>
        )}
      </form>

      <div className={CARD_CLASS}>
        <h2 className='text-white font-semibold'>Категории</h2>
        <div className='flex gap-2'>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={`${FIELD_CLASS} mt-0 flex-1`}
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

      <form onSubmit={handleCreateSlot} className={CARD_CLASS}>
        <h2 className='text-white font-semibold'>Плановый эфир (Москва)</h2>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='text-sm text-pink-100'>
            Лекция
            <select
              value={slotLectureId}
              onChange={(e) => setSlotLectureId(e.target.value)}
              required
              className={FIELD_CLASS}
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
              className={FIELD_CLASS}
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
