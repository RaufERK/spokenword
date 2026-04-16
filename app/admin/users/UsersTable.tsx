'use client'

import { ROLES, Role } from '@/lib/roles'
import { useState, useMemo, useEffect } from 'react'
import UserAccessModal from '@/components/admin/UserAccessModal'
import PaymentModal from '@/components/admin/PaymentModal'
import BulkPaymentModal from '@/components/admin/BulkPaymentModal'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Trash2, Link, Package, CheckCircle, XCircle, PlusCircle, Users, X, Ban, UserCog,
} from 'lucide-react'

export interface UserRow {
  id: number
  firstName: string
  lastName: string
  login: string
  password: string
  phoneNumber: string | null
  city: string | null
  accessUntil: string | null
  role: Role
  lastEvent: { title: string; paymentDate: string } | null
}

type SortField = 'name' | 'surname' | 'login' | 'city' | 'accessUntil' | 'role'
type SortDir = 'asc' | 'desc'
type PaymentFilter = 'all' | 'active' | 'inactive' | 'never' | 'admins'
type AccessUpdate = { id: number; accessUntil: string | null; eventTitle?: string }

type ProfileLinkPayload = {
  deployMode: 'primary' | 'mirror'
  currentUrl: string
  urls: { ru: string; eu: string }
  comments: { ru: string; eu: string }
}

function isAccessActive(accessUntil: string | null): boolean {
  if (!accessUntil) return false
  return new Date(accessUntil).getTime() > Date.now()
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="w-3 h-3 opacity-40" />
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
}

function SortableTh({
  field, label, current, dir, onSort, className = '',
}: {
  field: SortField; label: string; current: SortField; dir: SortDir; onSort: (f: SortField) => void; className?: string
}) {
  return (
    <th
      className={`px-3 py-2.5 text-left text-xs text-white/80 cursor-pointer hover:bg-white/10 transition-colors select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon field={field} current={current} dir={dir} />
      </div>
    </th>
  )
}

const FILTER_TABS: { key: PaymentFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Оплачено' },
  { key: 'inactive', label: 'Не оплачено' },
  { key: 'never', label: 'Новые' },
  { key: 'admins', label: 'Админы' },
]

export default function UsersTable({ users, currentRole }: { users: UserRow[]; currentRole: Role }) {
  const [list, setList] = useState(users)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [paymentUser, setPaymentUser] = useState<UserRow | null>(null)
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false)
  const [isBulkRoleOpen, setIsBulkRoleOpen] = useState(false)
  const [bulkRole, setBulkRole] = useState<Role>('USER')
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('surname')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  const isSuper = currentRole === 'SUPER'
  const canEdit = ['ADMIN', 'SUPER'].includes(currentRole)

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const totalAll = list.length
  const totalActive = list.filter((u) => isAccessActive(u.accessUntil)).length
  const totalInactive = list.filter((u) => u.lastEvent && !isAccessActive(u.accessUntil)).length
  const totalNever = list.filter((u) => !u.lastEvent).length
  const totalAdmins = list.filter((u) => ['ADMIN', 'SUPER', 'MODERATOR'].includes(u.role)).length

  const TAB_COUNTS: Record<PaymentFilter, number> = {
    all: totalAll,
    active: totalActive,
    inactive: totalInactive,
    never: totalNever,
    admins: totalAdmins,
  }

  const processed = useMemo(() => {
    let result = [...list]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.login.toLowerCase().includes(q) ||
          (u.city && u.city.toLowerCase().includes(q)) ||
          (u.phoneNumber && u.phoneNumber.includes(q))
      )
    }
    if (paymentFilter === 'active') result = result.filter((u) => isAccessActive(u.accessUntil))
    else if (paymentFilter === 'inactive') result = result.filter((u) => u.lastEvent && !isAccessActive(u.accessUntil))
    else if (paymentFilter === 'never') result = result.filter((u) => !u.lastEvent)
    else if (paymentFilter === 'admins') result = result.filter((u) => ['ADMIN', 'SUPER', 'MODERATOR'].includes(u.role))

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.firstName.localeCompare(b.firstName, 'ru')
      else if (sortField === 'surname') cmp = a.lastName.localeCompare(b.lastName, 'ru')
      else if (sortField === 'login') cmp = a.login.localeCompare(b.login, 'ru')
      else if (sortField === 'city') cmp = (a.city || '').localeCompare(b.city || '', 'ru')
      else if (sortField === 'accessUntil') {
        const da = a.accessUntil ? new Date(a.accessUntil).getTime() : 0
        const db = b.accessUntil ? new Date(b.accessUntil).getTime() : 0
        cmp = da - db
      } else if (sortField === 'role') {
        const order = { SUPER: 0, ADMIN: 1, MODERATOR: 2, USER: 3 }
        cmp = order[a.role] - order[b.role]
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [list, search, sortField, sortDir, paymentFilter])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleIds = processed.map((u) => u.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => list.some((u) => u.id === id)))
  }, [list])

  const handleCopyLink = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}/token`)
      const data = await res.json() as ProfileLinkPayload | { error?: string }
      if (!res.ok || !('urls' in data)) return alert('Ошибка при создании ссылки профиля')
      const copiedText = [
        `Профиль RU (${data.comments.ru}): ${data.urls.ru}`,
        `Профиль EU (${data.comments.eu}): ${data.urls.eu}`,
        `Текущий домен (${data.deployMode}): ${data.currentUrl}`,
      ].join('\n')
      await navigator.clipboard.writeText(copiedText)
      alert(['Скопированы две ссылки профиля:', `1) RU: ${data.urls.ru}`, `2) EU: ${data.urls.eu}`].join('\n'))
    } catch {
      alert('Ошибка при создании ссылки профиля')
    }
  }

  const applyAccessUpdates = (updates: AccessUpdate[]) => {
    const map = new Map(updates.map((u) => [u.id, u]))
    setList((prev) =>
      prev.map((u) => {
        const update = map.get(u.id)
        if (!update) return u
        return {
          ...u,
          accessUntil: update.accessUntil,
          lastEvent: update.eventTitle
            ? { title: update.eventTitle, paymentDate: new Date().toISOString() }
            : update.accessUntil === null
            ? u.lastEvent
            : u.lastEvent,
        }
      })
    )
  }

  const handleToggleUserSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleToggleVisibleSelection = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleIds.includes(id))
      const next = new Set(prev)
      visibleIds.forEach((id) => next.add(id))
      return Array.from(next)
    })
  }

  const clearSelection = () => setSelectedIds([])

  const handleBulkRevoke = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Отозвать доступ у ${selectedIds.length} пользователей?`)) return
    const res = await fetch('/api/users/bulk-payment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', userIds: selectedIds }),
    })
    if (!res.ok) { alert('Не удалось отозвать доступ'); return }
    const data = await res.json() as { users: AccessUpdate[] }
    applyAccessUpdates(data.users)
    clearSelection()
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Удалить ${selectedIds.length} пользователей? Это действие нельзя отменить.`)) return
    for (const id of selectedIds) {
      await fetch(`/api/users/${id}`, { method: 'DELETE' })
    }
    setList((prev) => prev.filter((u) => !selectedIds.includes(u.id)))
    clearSelection()
  }

  const handleBulkRole = async () => {
    if (selectedIds.length === 0) return
    for (const id of selectedIds) {
      await fetch(`/api/users/${id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: bulkRole }),
      })
    }
    setList((prev) => prev.map((u) => selectedIds.includes(u.id) ? { ...u, role: bulkRole } : u))
    setIsBulkRoleOpen(false)
    clearSelection()
  }

  const handleIndividualRevoke = async (userId: number) => {
    if (!confirm('Отозвать все активные оплаты у этого пользователя?')) return
    const res = await fetch(`/api/users/${userId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke' }),
    })
    if (!res.ok) { alert('Не удалось отозвать доступ'); return }
    applyAccessUpdates([{ id: userId, accessUntil: null }])
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' })
      if (res.ok) {
        setList((prev) => prev.filter((u) => u.id !== userToDelete.id))
        setIsDeleteModalOpen(false)
        setUserToDelete(null)
      } else {
        const error = await res.json()
        alert(`Ошибка при удалении: ${error.message}`)
      }
    } catch {
      alert('Произошла ошибка при удалении пользователя')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="mb-3 space-y-2">
        {/* Row 1: поиск + фильтры */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="bg-purple-950/50 border border-purple-400/30 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-pink-500 w-52"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-purple-900/40 p-0.5 rounded-lg border border-purple-400/20">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPaymentFilter(tab.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  paymentFilter === tab.key ? 'bg-pink-600 text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                {tab.label} <span className="opacity-60">({TAB_COUNTS[tab.key]})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: массовые действия */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-white/50 pr-1">
            {selectedIds.length > 0 ? `Выбрано: ${selectedIds.length}` : 'Выберите галочками'}
          </span>
          <button
            onClick={() => setIsBulkPaymentOpen(true)}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-600/90 hover:bg-green-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Дать доступ
          </button>
          <button
            onClick={handleBulkRevoke}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600/80 hover:bg-red-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Ban className="w-3.5 h-3.5" />
            Отозвать
          </button>
          <button
            onClick={() => { if (selectedIds.length > 0) { setSelectedUser(list.find(u => u.id === selectedIds[0]) ?? null); setIsModalOpen(true) } }}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600/80 hover:bg-purple-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            Платный контент
          </button>
          {isSuper && (
            <button
              onClick={() => { if (selectedIds.length > 0) setIsBulkRoleOpen(true) }}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-600/80 hover:bg-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <UserCog className="w-3.5 h-3.5" />
              Роль
            </button>
          )}
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-900/80 hover:bg-red-800 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Удалить
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-purple-800/60 hover:bg-purple-700 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 rounded-2xl border border-pink-400/20 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-pink-700 to-purple-700 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-center w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleToggleVisibleSelection}
                    className="w-3.5 h-3.5 rounded accent-pink-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs text-white/60 w-7">№</th>
                <SortableTh field="name" label="Имя" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="surname" label="Фамилия" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="login" label="Логин" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="city" label="Город" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2.5 text-left text-xs text-white/80 whitespace-nowrap">Телефон</th>
                <th className="px-3 py-2.5 text-left text-xs text-white/80 whitespace-nowrap">Последнее меропр.</th>
                <SortableTh field="accessUntil" label="Доступ до" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2.5 text-center text-xs text-white/80 whitespace-nowrap">Оплата</th>
                <th className="px-3 py-2.5 text-center text-xs text-white/80 whitespace-nowrap">Профиль</th>
              </tr>
            </thead>
            <tbody>
              {processed.map((u, i) => {
                const active = isAccessActive(u.accessUntil)
                const isEven = i % 2 === 0
                return (
                  <tr
                    key={u.id}
                    className={`border-t border-white/5 hover:bg-white/5 transition-colors text-sm ${
                      isEven ? 'bg-purple-950/10' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(u.id)}
                        onChange={() => handleToggleUserSelection(u.id)}
                        className="w-3.5 h-3.5 rounded accent-pink-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-white/30 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 text-white">{u.firstName}</td>
                    <td className="px-3 py-2 text-white font-medium">{u.lastName}</td>
                    <td className="px-3 py-2 text-blue-300 text-xs font-mono">{u.login}</td>
                    <td className="px-3 py-2 text-white/60 text-xs">{u.city || '—'}</td>
                    <td className="px-3 py-2 text-pink-200/80 text-xs font-mono whitespace-nowrap">{u.phoneNumber || '—'}</td>

                    {/* Последнее мероприятие */}
                    <td className="px-3 py-2 text-xs max-w-[140px]">
                      {u.lastEvent ? (
                        <span className="text-purple-200/80 truncate block" title={u.lastEvent.title}>
                          {u.lastEvent.title}
                        </span>
                      ) : (
                        <span className="text-white/20 italic">никогда</span>
                      )}
                    </td>

                    {/* Доступ до */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                          <CheckCircle className="w-3 h-3" />
                          {new Date(u.accessUntil!).toLocaleDateString('ru-RU')}
                        </span>
                      ) : u.accessUntil ? (
                        <span className="text-orange-400/60 text-xs">
                          истёк {new Date(u.accessUntil).toLocaleDateString('ru-RU')}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </td>

                    {/* Кнопка оплаты */}
                    <td className="px-3 py-2 text-center">
                      {active ? (
                        <button
                          onClick={() => handleIndividualRevoke(u.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                          title="Отозвать доступ"
                        >
                          <XCircle className="w-3 h-3" />
                          Отозвать
                        </button>
                      ) : (
                        <button
                          onClick={() => setPaymentUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-yellow-500/80 to-orange-500/80 hover:from-yellow-400 hover:to-orange-400 text-white transition-colors"
                        >
                          <PlusCircle className="w-3 h-3" />
                          ОПЛАТА
                        </button>
                      )}
                    </td>

                    {/* Профиль */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleCopyLink(u.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-600/70 hover:bg-blue-500 text-white transition-colors"
                        title="Скопировать ссылки профиля"
                      >
                        <Link className="w-3 h-3" />
                        RU/EU
                      </button>
                    </td>
                  </tr>
                )
              })}

              {processed.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <Users className="w-10 h-10 text-white/15 mx-auto mb-3" />
                    <p className="text-white/25 text-sm">
                      {search || paymentFilter !== 'all' ? 'Нет пользователей по фильтру' : 'Нет пользователей'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      <UserAccessModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedUser(null) }}
        onSave={() => { setIsModalOpen(false); setSelectedUser(null) }}
      />

      {paymentUser && (
        <PaymentModal
          isOpen={!!paymentUser}
          userId={paymentUser.id}
          userName={`${paymentUser.firstName} ${paymentUser.lastName}`}
          onClose={() => setPaymentUser(null)}
          onSave={({ userId, accessUntil, eventTitle }) => {
            applyAccessUpdates([{ id: userId, accessUntil, eventTitle }])
            setPaymentUser(null)
          }}
        />
      )}

      {isBulkPaymentOpen && (
        <BulkPaymentModal
          isOpen={isBulkPaymentOpen}
          userIds={selectedIds}
          onClose={() => setIsBulkPaymentOpen(false)}
          onSave={(updates) => {
            applyAccessUpdates(updates)
            setIsBulkPaymentOpen(false)
            clearSelection()
          }}
        />
      )}

      {/* Bulk Role Modal */}
      {isBulkRoleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-purple-900/95 border border-orange-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-orange-400" />
                Назначить роль ({selectedIds.length} чел.)
              </h2>
              <button onClick={() => setIsBulkRoleOpen(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-2 mb-5">
              {(['USER', 'MODERATOR', 'ADMIN'] as Role[]).map((r) => (
                <label key={r} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                  bulkRole === r ? 'border-orange-500/60 bg-orange-500/10' : 'border-white/10 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="bulk-role"
                    value={r}
                    checked={bulkRole === r}
                    onChange={() => setBulkRole(r)}
                    className="accent-orange-500"
                  />
                  <span className="text-white text-sm font-medium">{r}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsBulkRoleOpen(false)} className="flex-1 px-4 py-2 text-purple-300 border border-purple-600/50 rounded-xl hover:bg-purple-800 transition text-sm">Отмена</button>
              <button onClick={handleBulkRole} className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition text-sm font-medium">Назначить</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-purple-900/95 border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold text-red-400 mb-3">Удалить пользователя?</h2>
            <div className="p-3 bg-purple-800/50 border border-purple-600/40 rounded-xl mb-4">
              <p className="font-semibold text-white">{userToDelete.firstName} {userToDelete.lastName}</p>
              {userToDelete.phoneNumber && <p className="text-sm text-purple-300">{userToDelete.phoneNumber}</p>}
            </div>
            <p className="text-red-300/80 text-sm mb-5">Будут удалены профиль, доступы и история. Нельзя отменить.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null) }} disabled={isDeleting} className="px-4 py-2 text-purple-300 border border-purple-600/50 rounded-xl hover:bg-purple-800 disabled:opacity-50 transition text-sm">Отмена</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl disabled:opacity-50 transition text-sm font-medium">
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
