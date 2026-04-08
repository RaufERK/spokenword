'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, Send, Link as LinkIcon, Trash2 } from 'lucide-react'

type ChatUser = {
  id: number
  firstName: string
  lastName: string
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER'
}

type Reactions = Partial<Record<ReactionType, number[]>>

type Message = {
  id: number
  text: string
  link: string | null
  reactions: string
  createdAt: string
  user: ChatUser
}

const PRIVILEGED_ROLES = ['MODERATOR', 'ADMIN', 'SUPER'] as const

type ReactionType = 'like' | 'heart' | 'smile' | 'fire' | 'clap'

const REACTION_EMOJIS: { type: ReactionType; emoji: string; activeClass: string }[] = [
  { type: 'like',  emoji: '👍', activeClass: 'bg-blue-600/30 text-blue-300' },
  { type: 'heart', emoji: '❤️', activeClass: 'bg-pink-600/30 text-pink-300' },
  { type: 'smile', emoji: '😊', activeClass: 'bg-yellow-600/30 text-yellow-300' },
  { type: 'fire',  emoji: '🔥', activeClass: 'bg-orange-600/30 text-orange-300' },
  { type: 'clap',  emoji: '👏', activeClass: 'bg-green-600/30 text-green-300' },
]

function parseReactions(raw: string): Reactions {
  try { return JSON.parse(raw) } catch { return {} }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const firstLoad = useRef(true)

  const rawId = (session?.user as { id?: string | number })?.id
  const userId = rawId !== undefined ? Number(rawId) : undefined
  const userRole = (session?.user as { role?: string })?.role || ''
  const isPrivileged = PRIVILEGED_ROLES.includes(userRole as typeof PRIVILEGED_ROLES[number])

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
    if (!text.trim() && !link.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), link: link.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Ошибка'); return }
      setText('')
      setLink('')
      await fetchMessages()
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } finally { setSending(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить сообщение?')) return
    await fetch(`/api/chat/${id}`, { method: 'DELETE' })
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  const handleReact = async (msgId: number, type: ReactionType) => {
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m
      const r = parseReactions(m.reactions)
      const arr = r[type] || []
      const idx = arr.indexOf(userId!)
      // remove from all then toggle
      const cleaned: Reactions = {}
      for (const k of Object.keys(r) as ReactionType[]) {
        cleaned[k] = (r[k] || []).filter((uid) => uid !== userId)
        if (!cleaned[k]!.length) delete cleaned[k]
      }
      if (idx < 0) {
        cleaned[type] = [...(cleaned[type] || []), userId!]
      }
      return { ...m, reactions: JSON.stringify(cleaned) }
    }))

    const res = await fetch(`/api/chat/${msgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (!res.ok) fetchMessages() // revert on error
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-[60vh] text-white/50">Загрузка...</div>
  }
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <p className="text-white/60">Войдите, чтобы открыть чат — <a href="/login" className="text-blue-400 underline">Войти</a></p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 h-[calc(100vh-5rem)]">
      <div className="h-full flex flex-col bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl text-white leading-tight">Чат общины</h1>
              <p className="text-purple-200/70 text-sm">Общение участников · обновляется каждые 5 сек</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              Сообщений пока нет
            </div>
          )}

          {messages.map((msg) => {
            const isAdmin = ['ADMIN', 'SUPER'].includes(msg.user.role)
            const isMod = msg.user.role === 'MODERATOR'
            const reactions = parseReactions(msg.reactions)
            const myReaction = userId !== undefined
              ? (Object.keys(reactions) as ReactionType[]).find((k) => reactions[k]?.includes(userId))
              : undefined

            return (
              <div
                key={msg.id}
                className={`backdrop-blur-sm rounded-xl p-4 border transition-all ${
                  isAdmin
                    ? 'bg-gradient-to-br from-pink-900/50 to-rose-900/40 border-pink-500/40 shadow-lg shadow-pink-500/10'
                    : isMod
                    ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30'
                    : 'bg-white/8 border-white/5 hover:border-purple-400/30'
                }`}
              >
                {/* Message header row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${isAdmin ? 'text-pink-200' : isMod ? 'text-yellow-200' : 'text-purple-300'}`}>
                      {msg.user.firstName} {msg.user.lastName}
                    </span>

                    {msg.user.role === 'SUPER' && (
                      <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-1.5 py-0.5 rounded text-xs border border-pink-400/50 font-medium">
                        SUPER
                      </span>
                    )}
                    {msg.user.role === 'ADMIN' && (
                      <span className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-1.5 py-0.5 rounded text-xs border border-rose-400/50 font-medium">
                        ADMIN
                      </span>
                    )}
                    {msg.user.role === 'MODERATOR' && (
                      <span className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-1.5 py-0.5 rounded text-xs border border-yellow-400/50 font-medium">
                        MOD
                      </span>
                    )}

                    <span className={`text-xs ${isAdmin ? 'text-pink-300/50' : 'text-purple-400/50'}`}>•</span>
                    <span className={`text-xs ${isAdmin ? 'text-pink-300/50' : 'text-purple-400/50'}`}>
                      {formatDate(msg.createdAt)}
                    </span>
                    <span className={`text-xs ${isAdmin ? 'text-pink-300/50' : 'text-purple-400/50'}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  {isPrivileged && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="text-red-400/60 hover:text-red-400 transition-colors ml-2 shrink-0"
                      title="Удалить сообщение"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Text */}
                {msg.text && <p className="text-white text-sm leading-relaxed mb-2">{msg.text}</p>}

                {/* Link */}
                {msg.link && (
                  <a
                    href={msg.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 underline text-sm mb-3 break-all ${
                      isAdmin ? 'text-pink-300 hover:text-pink-200' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{msg.link}</span>
                  </a>
                )}

                {/* Reactions */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 flex-wrap">
                  {REACTION_EMOJIS.map(({ type, emoji, activeClass }) => {
                    const count = reactions[type]?.length || 0
                    const active = myReaction === type
                    return (
                      <button
                        key={type}
                        onClick={() => userId !== undefined && handleReact(msg.id, type)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                          active
                            ? activeClass
                            : 'bg-white/5 text-purple-300 hover:bg-white/10'
                        }`}
                        title={type}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="font-medium">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <div className="p-5 border-t border-white/10 shrink-0">
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
              placeholder="Введите сообщение..."
              rows={2}
              maxLength={1000}
              className="w-full px-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-xl text-white placeholder-purple-300/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none text-sm"
            />

            {isPrivileged && (
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Ссылка (необязательно)"
                  className="w-full pl-10 pr-4 py-3 bg-purple-950/50 border border-purple-400/30 rounded-xl text-white placeholder-purple-300/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={sending || (!text.trim() && !link.trim())}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-40 text-white py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-medium"
            >
              <Send className="w-5 h-5" />
              <span>Отправить</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
