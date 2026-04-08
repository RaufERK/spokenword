'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { GraduationCap, Save, Trash2, AlertCircle } from 'lucide-react'

export default function AdminClassPage() {
  const { data } = useSession()
  const role = data?.user?.role

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [rutubeUrl, setRutubeUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/class/stream-links')
      .then((r) => r.json())
      .then((result) => {
        if (result.success && result.data) {
          setYoutubeUrl(result.data.youtubeUrl || '')
          setRutubeUrl(result.data.rutubeUrl || '')
        }
      })
      .catch(console.error)
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/class/stream-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, rutubeUrl }),
      })
      const result = await res.json()
      setMessage(result.success ? '✅ Ссылки успешно обновлены!' : `❌ Ошибка: ${result.error}`)
    } catch {
      setMessage('❌ Ошибка при обновлении ссылок')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить все ссылки конференции?')) return
    setDeleting(true)
    setMessage('')
    try {
      const res = await fetch('/api/class/stream-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: '', rutubeUrl: '' }),
      })
      const result = await res.json()
      if (result.success) {
        setYoutubeUrl('')
        setRutubeUrl('')
        setMessage('✅ Ссылки удалены')
      } else {
        setMessage(`❌ Ошибка: ${result.error}`)
      }
    } catch {
      setMessage('❌ Ошибка при удалении ссылок')
    } finally {
      setDeleting(false)
    }
  }

  if (!role || !['MODERATOR', 'ADMIN', 'SUPER'].includes(role)) {
    return <div className='p-10 text-red-400'>Нет доступа.</div>
  }

  const hasLinks = !!(youtubeUrl || rutubeUrl)

  return (
    <div className='max-w-2xl mx-auto space-y-6'>
      <div className='flex items-center gap-3'>
        <GraduationCap className='w-8 h-8 text-green-400' />
        <div>
          <h1 className='text-2xl font-bold text-white'>Ссылки на конференцию</h1>
          <p className='text-purple-200 text-sm'>Закрытая трансляция — только для оплативших</p>
        </div>
      </div>

      <div className='bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm border border-pink-400/20 rounded-2xl shadow-2xl p-8'>

        {/* Предупреждение */}
        <div className='bg-yellow-900/40 border border-yellow-400/30 rounded-lg p-4 mb-6'>
          <div className='flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5' />
            <div className='text-yellow-200 text-sm'>
              <p className='font-medium mb-1'>⚠️ Ссылки доступны только оплатившим пользователям!</p>
              <p className='text-yellow-300/80'>Текущие ссылки:</p>
              <p>• YouTube: <span className='text-white'>{youtubeUrl || 'не установлена'}</span></p>
              <p>• Rutube: <span className='text-white'>{rutubeUrl || 'не установлена'}</span></p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className='space-y-5'>
          <div>
            <label className='block text-white mb-2'>Ссылка YouTube для конференции:</label>
            <input
              type='url'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder='https://youtube.com/live/...'
              className='w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all'
            />
          </div>

          <div>
            <label className='block text-white mb-2'>Ссылка Rutube для конференции:</label>
            <input
              type='url'
              value={rutubeUrl}
              onChange={(e) => setRutubeUrl(e.target.value)}
              placeholder='https://rutube.ru/live/...'
              className='w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all'
            />
          </div>

          <button
            type='submit'
            disabled={saving}
            className='w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50'
          >
            <Save className='w-5 h-5' />
            {saving ? 'Сохранение...' : 'Обновить ссылки конференции'}
          </button>

          {message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              message.startsWith('✅')
                ? 'bg-green-900/40 text-green-300 border border-green-500/30'
                : 'bg-red-900/40 text-red-300 border border-red-500/30'
            }`}>
              {message}
            </div>
          )}

          <button
            type='button'
            onClick={handleDelete}
            disabled={deleting || !hasLinks}
            className='w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed'
          >
            <Trash2 className='w-5 h-5' />
            {deleting ? 'Удаление...' : 'Удалить все ссылки'}
          </button>
        </form>
      </div>

      <div className='bg-gradient-to-br from-purple-900/40 to-purple-800/30 border border-purple-400/20 rounded-xl p-4'>
        <h3 className='text-white text-sm font-medium mb-2'>Инструкция:</h3>
        <ul className='text-purple-200 space-y-1 text-xs'>
          <li>• Вставьте ссылки на YouTube и Rutube для закрытой трансляции</li>
          <li>• Ссылки будут видны только пользователям с активной оплатой</li>
          <li>• Кнопка «Удалить» убирает ссылки из меню пользователей</li>
          <li>• Записи загружаются через раздел «Загрузка»</li>
        </ul>
      </div>
    </div>
  )
}
