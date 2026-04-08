'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Trash2, Link2 } from 'lucide-react'

type ChatUser = {
  id: number
  firstName: string
  lastName: string
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER'
}

type Message = {
  id: number
  text: string
  link: string | null
  createdAt: string
  user: ChatUser
}

const PRIVILEGED_ROLES = ['MODERATOR', 'ADMIN', 'SUPER']

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })
}

function getRoleBadge(role: ChatUser['role']) {
  switch (role) {
    case 'SUPER':
      return <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 font-semibold">SUPER</span>
    case 'ADMIN':
      return <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-300 font-semibold">ADMIN</span>
    case 'MODERATOR':
      return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/30 text-yellow-300 font-semibold">MOD</span>
    default:
      return null
  }
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstLoad = useRef(true)

  const userRole = (session?.user as { role?: string })?.role || ''
  const isPrivileged = PRIVILEGED_ROLES.includes(userRole)
  const rawId = (session?.user as { id?: string | number })?.id
  const userId = rawId !== undefined ? Number(rawId) : undefined

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat?limit=100', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setMessages(json.data || [])
      if (firstLoad.current) {
        firstLoad.current = false
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [status, fetchMessages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), link: link.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Ошибка')
        return
      }
      setText('')
      setLink('')
      setShowLinkInput(false)
      await fetchMessages()
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/chat/${id}`, { method: 'DELETE' })
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/60">Загрузка...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-white/60 mb-4">Войдите, чтобы открыть чат</p>
          <a href="/login" className="text-blue-400 hover:underline">Войти</a>
        </div>
      </div>
    )
  }

  // Group messages by date
  const groups: { date: string; messages: Message[] }[] = []
  messages.forEach((m) => {
    const d = formatDate(m.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.date === d) {
      last.messages.push(m)
    } else {
      groups.push({ date: d, messages: [m] })
    }
  })

  return (
    <main className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto w-full px-2 py-4">
      <div className="mb-4 px-2">
        <h1 className="text-2xl font-bold text-white">Чат</h1>
        <p className="text-white/50 text-sm">Обновляется каждые 5 секунд</p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 space-y-1 mb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/40">
            Сообщений пока нет
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/40">{group.date}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {group.messages.map((msg) => {
              const isOwn = msg.user.id === userId
              const privileged = PRIVILEGED_ROLES.includes(msg.user.role)

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 py-1 px-2 rounded-xl group hover:bg-white/5 transition-colors ${
                    privileged ? 'bg-yellow-500/5 border border-yellow-500/10' : ''
                  } ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      privileged
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}
                  >
                    {msg.user.firstName[0]}{msg.user.lastName[0]}
                  </div>

                  {/* Content */}
                  <div className={`flex flex-col gap-0.5 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <span className={`font-medium ${privileged ? 'text-yellow-300' : 'text-white/70'}`}>
                        {msg.user.firstName} {msg.user.lastName}
                      </span>
                      {getRoleBadge(msg.user.role)}
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>

                    <div
                      className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-blue-600/40 text-white rounded-tr-none'
                          : privileged
                          ? 'bg-yellow-500/15 text-white rounded-tl-none border border-yellow-500/20'
                          : 'bg-white/8 text-white/90 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                      {msg.link && (
                        <a
                          href={msg.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-blue-400 hover:text-blue-300 underline text-xs break-all"
                        >
                          {msg.link}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Delete button (moderator+) */}
                  {isPrivileged && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all self-start mt-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-3">
        {error && (
          <p className="text-red-400 text-sm mb-2 px-1">{error}</p>
        )}

        {showLinkInput && isPrivileged && (
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
            placeholder="Написать сообщение..."
            rows={1}
            maxLength={1000}
            className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-blue-500/50 resize-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          {isPrivileged && (
            <button
              type="button"
              onClick={() => setShowLinkInput((v) => !v)}
              className={`p-2 rounded-xl transition-colors ${
                showLinkInput
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-white/10 text-white/50 hover:text-white/80'
              }`}
              title="Прикрепить ссылку"
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl p-2 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white/30 mt-1 px-1">Enter — отправить, Shift+Enter — новая строка</p>
      </form>
    </main>
  )
}
