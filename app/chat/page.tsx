'use client'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MessageCircle, Send, Link as LinkIcon, Trash2, Search, User,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER'

interface ChatUser { id: number; firstName: string; lastName: string; role: Role }

interface Message {
  id: number
  text: string
  link: string | null
  reactions: string
  createdAt: string
  user: ChatUser
}

interface Room {
  id: number | null
  type: 'GENERAL' | 'SUPPORT' | 'PRIVATE'
  name: string
  icon: string
  unreadCount: number
  participantId?: number
  lastMessage: { text: string; time: string; authorName: string } | null
}

type ReactionType = 'like' | 'heart' | 'smile' | 'fire' | 'clap'

const REACTIONS: { type: ReactionType; emoji: string; active: string }[] = [
  { type: 'like',  emoji: '👍', active: 'bg-blue-600/30 text-blue-300' },
  { type: 'heart', emoji: '❤️', active: 'bg-pink-600/30 text-pink-300' },
  { type: 'smile', emoji: '😊', active: 'bg-yellow-600/30 text-yellow-300' },
  { type: 'fire',  emoji: '🔥', active: 'bg-orange-600/30 text-orange-300' },
  { type: 'clap',  emoji: '👏', active: 'bg-green-600/30 text-green-300' },
]

const PRIVILEGED = ['MODERATOR', 'ADMIN', 'SUPER']

function parseReactions(raw: string): Partial<Record<ReactionType, number[]>> {
  try { return JSON.parse(raw) } catch { return {} }
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function roleBadge(role: Role) {
  if (role === 'SUPER') return <span className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-1.5 py-0.5 rounded text-[10px] border border-pink-400/50">SUPER</span>
  if (role === 'ADMIN') return <span className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-1.5 py-0.5 rounded text-[10px] border border-rose-400/50">ADMIN</span>
  if (role === 'MODERATOR') return <span className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-1.5 py-0.5 rounded text-[10px] border border-yellow-400/50">MOD</span>
  return null
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: session, status } = useSession()
  const userId = Number((session?.user as { id?: string })?.id ?? 0)
  const userRole = ((session?.user as { role?: string })?.role ?? '') as Role
  const isPrivileged = PRIVILEGED.includes(userRole)

  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const firstMsgLoad = useRef(true)
  const pendingScroll = useRef(false)
  const [msgsVisible, setMsgsVisible] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const roomsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeRoom = rooms.find(r => r.id === activeRoomId) ?? null

  // ── Fetch rooms ────────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/rooms', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setRooms(data.rooms ?? [])
      // Если нет активной комнаты — открыть GENERAL
      setActiveRoomId(prev => {
        if (prev !== null) return prev
        const general = (data.rooms as Room[]).find(r => r.type === 'GENERAL')
        return general?.id ?? null
      })
    } catch {}
  }, [])

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (roomId: number) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (firstMsgLoad.current) {
        firstMsgLoad.current = false
        pendingScroll.current = true
      }
      setMessages(data.messages ?? [])
    } catch {}
  }, [])

  // После рендера новых сообщений — мгновенный скролл вниз, затем показываем
  useEffect(() => {
    if (!pendingScroll.current) return
    pendingScroll.current = false
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    setMsgsVisible(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // Если сообщений нет — всё равно показываем контейнер
  useEffect(() => {
    if (!pendingScroll.current) return
    if (msgsVisible) return
    // fetchMessages мог вернуть пустой массив, messages не изменился → показываем
    const timer = setTimeout(() => {
      if (!pendingScroll.current) return
      pendingScroll.current = false
      setMsgsVisible(true)
    }, 150)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId])

  // ── Adaptive interval + visibility pause ──────────────────────────────────
  const getInterval = () => Date.now() - lastActivityRef.current > 120_000 ? 10_000 : 5_000

  const startPolling = useCallback(() => {
    if (roomsIntervalRef.current) clearInterval(roomsIntervalRef.current)
    roomsIntervalRef.current = setInterval(() => { fetchRooms() }, getInterval())
  }, [fetchRooms])

  const startMsgPolling = useCallback((roomId: number) => {
    if (msgsIntervalRef.current) clearInterval(msgsIntervalRef.current)
    msgsIntervalRef.current = setInterval(() => { fetchMessages(roomId) }, getInterval())
  }, [fetchMessages])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchRooms()
    startPolling()

    const onActivity = () => { lastActivityRef.current = Date.now() }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (roomsIntervalRef.current) clearInterval(roomsIntervalRef.current)
        if (msgsIntervalRef.current) clearInterval(msgsIntervalRef.current)
      } else {
        fetchRooms()
        startPolling()
        if (activeRoomId) { fetchMessages(activeRoomId); startMsgPolling(activeRoomId) }
      }
    }

    document.addEventListener('mousemove', onActivity)
    document.addEventListener('keydown', onActivity)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (roomsIntervalRef.current) clearInterval(roomsIntervalRef.current)
      if (msgsIntervalRef.current) clearInterval(msgsIntervalRef.current)
      document.removeEventListener('mousemove', onActivity)
      document.removeEventListener('keydown', onActivity)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, fetchRooms, startPolling, fetchMessages, startMsgPolling, activeRoomId])

  // ── Switch room ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRoomId) return
    firstMsgLoad.current = true
    pendingScroll.current = false
    setMsgsVisible(false)
    setMessages([])
    fetchMessages(activeRoomId)
    startMsgPolling(activeRoomId)
    fetchRooms() // обновить unreadCount
  }, [activeRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search users ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return }
    const timeout = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data.users ?? [])
      } catch {} finally { setSearchLoading(false) }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // ── Open/create private room ───────────────────────────────────────────────
  const openPrivateRoom = async (participantId: number) => {
    setSearchQuery('')
    setSearchResults([])
    const existing = rooms.find(r => r.type === 'PRIVATE' && r.participantId === participantId)
    if (existing?.id) { setActiveRoomId(existing.id); setMobileChatOpen(true); return }
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PRIVATE', participantId }),
    })
    const data = await res.json()
    if (data.roomId) { await fetchRooms(); setActiveRoomId(data.roomId); setMobileChatOpen(true) }
  }

  // ── Open/create support room ───────────────────────────────────────────────
  const openSupportRoom = async () => {
    const existing = rooms.find(r => r.type === 'SUPPORT' && r.id !== null)
    if (existing?.id) { setActiveRoomId(existing.id); setMobileChatOpen(true); return }
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SUPPORT' }),
    })
    const data = await res.json()
    if (data.roomId) { await fetchRooms(); setActiveRoomId(data.roomId); setMobileChatOpen(true) }
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !activeRoomId) return
    setSending(true); setError('')
    try {
      const res = await fetch(`/api/chat/rooms/${activeRoomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), link: link.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Ошибка'); return }
      setText(''); setLink('')
      await fetchMessages(activeRoomId)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    } finally { setSending(false) }
  }

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDelete = async (msgId: number) => {
    if (!confirm('Удалить сообщение?')) return
    await fetch(`/api/chat/${msgId}`, { method: 'DELETE' })
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  // ── React ──────────────────────────────────────────────────────────────────
  const handleReact = async (msgId: number, type: ReactionType) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m
      const r = parseReactions(m.reactions)
      const cleaned: Partial<Record<ReactionType, number[]>> = {}
      for (const k of Object.keys(r) as ReactionType[]) {
        cleaned[k] = (r[k] ?? []).filter(id => id !== userId)
        if (!cleaned[k]!.length) delete cleaned[k]
      }
      const wasActive = (r[type] ?? []).includes(userId)
      if (!wasActive) cleaned[type] = [...(cleaned[type] ?? []), userId]
      return { ...m, reactions: JSON.stringify(cleaned) }
    }))
    const res = await fetch(`/api/chat/${msgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    })
    if (!res.ok && activeRoomId) fetchMessages(activeRoomId)
  }

  // ── Handle room click ──────────────────────────────────────────────────────
  const handleRoomClick = (room: Room) => {
    if (room.id === null) {
      openSupportRoom()
    } else {
      setActiveRoomId(room.id)
    }
    setMobileChatOpen(true)
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (status === 'loading') return <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-white/40">Загрузка...</div>
  if (status === 'unauthenticated') return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-center">
      <p className="text-white/60">Войдите чтобы открыть чат — <a href="/login" className="text-blue-400 underline">Войти</a></p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 h-[calc(100vh-3.5rem)]">
      <div className="h-full flex bg-gradient-to-br from-purple-900/40 to-purple-800/30 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={`w-full md:w-72 shrink-0 border-r border-white/10 flex flex-col ${mobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
          {/* Header + search */}
          <div className="p-3 border-b border-white/10">
            <h2 className="text-base text-white font-medium flex items-center gap-2 mb-2.5">
              <MessageCircle className="w-5 h-5 text-purple-400" />
              Чаты
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени..."
                className="w-full pl-8 pr-3 py-1.5 bg-purple-950/50 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/40 focus:ring-1 focus:ring-purple-500 outline-none text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Search results */}
            {searchQuery.trim().length >= 2 && (
              <div className="border-b border-white/10">
                <div className="px-3 py-1 bg-purple-900/30">
                  <p className="text-purple-300 text-[11px] font-medium">
                    {searchLoading ? 'Поиск...' : searchResults.length > 0 ? `Найдено: ${searchResults.length}` : 'Ничего не найдено'}
                  </p>
                </div>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => openPrivateRoom(u.id)}
                    className="w-full px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 bg-purple-600/40 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-purple-400 text-[10px]">
                        {u.role === 'SUPER' ? 'Супер-администратор' : u.role === 'ADMIN' ? 'Администратор' : u.role === 'MODERATOR' ? 'Модератор' : 'Участник'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Room list */}
            {rooms.map(room => (
              <button
                key={room.id ?? 'support-new'}
                onClick={() => handleRoomClick(room)}
                className={`w-full px-3 py-2.5 text-left transition-all border-b border-white/5 ${
                  activeRoomId === room.id && room.id !== null
                    ? 'bg-purple-600/30 border-l-2 border-l-purple-400'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg shrink-0">{room.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-medium truncate">{room.name}</p>
                      {room.lastMessage && (
                        <p className="text-purple-300 text-[11px] truncate">
                          {room.lastMessage.authorName}: {room.lastMessage.text}
                        </p>
                      )}
                      {!room.lastMessage && room.type === 'SUPPORT' && room.id === null && (
                        <p className="text-purple-400/60 text-[11px]">Нажмите чтобы написать</p>
                      )}
                    </div>
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
                {room.lastMessage && (
                  <p className="text-purple-400/50 text-[10px] mt-0.5 ml-8">
                    {fmtTime(room.lastMessage.time)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main chat panel ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileChatOpen ? 'flex' : 'hidden md:flex'}`}>
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
              Выберите чат
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileChatOpen(false)}
                    className="md:hidden text-purple-300 hover:text-white transition-colors mr-1 shrink-0"
                    aria-label="Назад"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <span className="text-xl">{activeRoom.icon}</span>
                  <div>
                    <h1 className="text-base text-white font-medium">{activeRoom.name}</h1>
                    <p className="text-purple-200/60 text-xs">
                      {activeRoom.type === 'GENERAL' && 'Общение участников · обновляется автоматически'}
                      {activeRoom.type === 'SUPPORT' && 'Обращения к администрации'}
                      {activeRoom.type === 'PRIVATE' && 'Личная переписка'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-2 transition-opacity duration-0 ${msgsVisible ? 'opacity-100' : 'opacity-0'}`}>
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-white/30 text-sm">
                    Сообщений пока нет
                  </div>
                )}
                {messages.map(msg => {
                  const isAdmin = msg.user.role === 'ADMIN' || msg.user.role === 'SUPER'
                  const isMod = msg.user.role === 'MODERATOR'
                  const isOwn = msg.user.id === userId
                  const reactions = parseReactions(msg.reactions)
                  const myReaction = (Object.keys(reactions) as ReactionType[]).find(k => reactions[k]?.includes(userId))

                  return (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 border transition-all ${
                        isAdmin
                          ? 'bg-gradient-to-br from-pink-900/50 to-rose-900/40 border-pink-500/40 shadow-sm shadow-pink-500/10'
                          : isMod
                          ? 'bg-gradient-to-br from-yellow-900/30 to-amber-900/20 border-yellow-500/30'
                          : 'bg-white/8 border-white/5 hover:border-purple-400/20'
                      }`}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => !isOwn && activeRoom.type === 'GENERAL' && openPrivateRoom(msg.user.id)}
                            className={`font-semibold text-xs ${isAdmin ? 'text-pink-200' : isMod ? 'text-yellow-200' : 'text-purple-300'} ${!isOwn && activeRoom.type === 'GENERAL' ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                          >
                            {msg.user.firstName} {msg.user.lastName}
                          </button>
                          {roleBadge(msg.user.role)}
                          <span className={`text-[10px] ${isAdmin ? 'text-pink-300/50' : 'text-purple-400/50'}`}>
                            {fmtDate(msg.createdAt)} {fmtTime(msg.createdAt)}
                          </span>
                        </div>
                        {isPrivileged && (
                          <button onClick={() => handleDelete(msg.id)} className="text-red-400/50 hover:text-red-400 transition-colors ml-2 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Text */}
                      {msg.text && <p className="text-white text-sm leading-relaxed mb-1.5">{msg.text}</p>}

                      {/* Link */}
                      {msg.link && (
                        <a href={msg.link} target="_blank" rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 underline text-xs mb-2 break-all ${isAdmin ? 'text-pink-300 hover:text-pink-200' : 'text-blue-400 hover:text-blue-300'}`}
                        >
                          <LinkIcon className="w-3 h-3 shrink-0" />
                          {msg.link}
                        </a>
                      )}

                      {/* Reactions */}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5 flex-wrap">
                        {REACTIONS.map(({ type, emoji, active }) => {
                          const count = reactions[type]?.length ?? 0
                          const isActive = myReaction === type
                          return (
                            <button
                              key={type}
                              onClick={() => handleReact(msg.id, type)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-all ${isActive ? active : 'bg-white/5 text-purple-300 hover:bg-white/10'}`}
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

              {/* Input form */}
              <div className="p-3 border-t border-white/10 shrink-0">
                {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                <form onSubmit={handleSend} className="space-y-2">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                    placeholder="Введите сообщение... (Enter — отправить, Shift+Enter — перенос)"
                    rows={2}
                    maxLength={1000}
                    className="w-full px-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded-xl text-white placeholder-purple-300/40 focus:ring-1 focus:ring-purple-500 outline-none resize-none text-sm"
                  />
                  {(isPrivileged || activeRoom.type === 'PRIVATE') && (
                    <div className="relative">
                      <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
                      <input
                        type="url"
                        value={link}
                        onChange={e => setLink(e.target.value)}
                        placeholder="Ссылка (необязательно)"
                        className="w-full pl-8 pr-3 py-2 bg-purple-950/50 border border-purple-400/30 rounded-xl text-white placeholder-purple-300/40 focus:ring-1 focus:ring-purple-500 outline-none text-sm"
                      />
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-40 text-white py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    Отправить
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
