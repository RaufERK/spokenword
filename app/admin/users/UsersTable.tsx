'use client'

import { ROLES, Role } from '@/lib/roles'
import { useState, useMemo, useEffect } from 'react'
import UserAccessModal from '@/components/admin/UserAccessModal'
import PaymentModal from '@/components/admin/PaymentModal'
import BulkPaymentModal from '@/components/admin/BulkPaymentModal'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Trash2, Link, Package, CheckCircle, XCircle, PlusCircle, Users, X, Ban,
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
type PaymentFilter = 'all' | 'active' | 'inactive' | 'never'
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
  if (field !== current) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5" />
    : <ChevronDown className="w-3.5 h-3.5" />
}

function SortableTh({
  field, label, current, dir, onSort,
}: {
  field: SortField; label: string; current: SortField; dir: SortDir; onSort: (f: SortField) => void
}) {
  return (
    <th
      className="px-4 py-3 text-left text-sm text-white cursor-pointer hover:bg-white/10 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon field={field} current={current} dir={dir} />
      </div>
    </th>
  )
}

export default function UsersTable({ users, currentRole }: { users: UserRow[]; currentRole: Role }) {
  const [list, setList] = useState(users)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [paymentUser, setPaymentUser] = useState<UserRow | null>(null)
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('surname')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  const isSuper = currentRole === 'SUPER'

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const totalActive = list.filter((u) => isAccessActive(u.accessUntil)).length
  const totalNever = list.filter((u) => !u.lastEvent).length
  const totalInactive = list.filter((u) => u.lastEvent && !isAccessActive(u.accessUntil)).length

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

    if (!res.ok) { alert('Не удалось массово отозвать доступ'); return }
    const data = await res.json() as { users: AccessUpdate[] }
    applyAccessUpdates(data.users)
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

  const changeRole = async (id: number, newRole: Role) => {
    const res = await fetch(`/api/users/${id}/admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (!res.ok) return alert('Не удалось обновить роль')
    const { role } = await res.json()
    setList((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
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

  const colCount = isSuper ? 12 : 11

  const FILTER_LABELS: Record<PaymentFilter, string> = {
    all: `Все (${list.length})`,
    active: `Активные (${totalActive})`,
    inactive: `Истёк (${totalInactive})`,
    never: `Никогда (${totalNever})`,
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, логину, городу, телефону..."
              className="w-full bg-purple-950/50 border border-purple-400/30 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-purple-300/40 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-purple-900/40 p-1 rounded-xl border border-purple-400/20 self-start flex-wrap">
            {(['all', 'active', 'inactive', 'never'] as PaymentFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPaymentFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  paymentFilter === f ? 'bg-pink-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/70 px-2">Выбрано: {selectedIds.length}</span>
          <button
            onClick={() => setIsBulkPaymentOpen(true)}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/90 hover:bg-green-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Массово выдать доступ
          </button>
          <button
            onClick={handleBulkRevoke}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/90 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Массово отозвать доступ
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-800/70 hover:bg-purple-700 text-white transition-colors"
            >
              Сбросить выделение
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-pink-400/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-pink-700 to-purple-700">
              <tr>
                <th className="px-4 py-3 text-center text-sm text-white w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleToggleVisibleSelection}
                    className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
                    title="Выбрать/снять всех в текущем фильтре"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm text-white w-8">№</th>
                <SortableTh field="name" label="Имя" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="surname" label="Фамилия" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-sm text-white">Телефон</th>
                <SortableTh field="login" label="Логин" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="city" label="Город" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-sm text-white">Последнее мероприятие</th>
                <SortableTh field="accessUntil" label="Доступ до" current={sortField} dir={sortDir} onSort={handleSort} />
                {isSuper && (
                  <SortableTh field="role" label="Роль" current={sortField} dir={sortDir} onSort={handleSort} />
                )}
                <th className="px-4 py-3 text-center text-sm text-white">Пл. материалы</th>
                <th className="px-4 py-3 text-center text-sm text-white">Профиль</th>
                <th className="px-4 py-3 text-center text-sm text-white">Удалить</th>
              </tr>
            </thead>
            <tbody>
              {processed.map((u, i) => {
                const active = isAccessActive(u.accessUntil)
                return (
                  <tr key={u.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(u.id)}
                        onChange={() => handleToggleUserSelection(u.id)}
                        className="w-4 h-4 rounded accent-pink-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-white/40 text-sm">{i + 1}</td>
                    <td className="px-4 py-3 text-white text-sm">{u.firstName}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{u.lastName}</td>
                    <td className="px-4 py-3 text-pink-200 text-sm font-mono">{u.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-blue-300 text-sm font-mono">{u.login}</td>
                    <td className="px-4 py-3 text-white/70 text-sm">{u.city || '—'}</td>

                    {/* Последнее мероприятие */}
                    <td className="px-4 py-3 text-sm">
                      {u.lastEvent ? (
                        <span className="text-purple-200 text-xs">{u.lastEvent.title}</span>
                      ) : (
                        <span className="text-white/20 text-xs italic">никогда</span>
                      )}
                    </td>

                    {/* Доступ */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {active ? (
                          <>
                            <span
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30"
                              title="Доступ активен"
                            >
                              <CheckCircle className="w-3 h-3" />
                              до {new Date(u.accessUntil!).toLocaleDateString('ru-RU')}
                            </span>
                            <button
                              onClick={() => handleIndividualRevoke(u.id)}
                              className="p-1 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Отозвать доступ"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : u.accessUntil ? (
                          <button
                            onClick={() => setPaymentUser(u)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                          >
                            <XCircle className="w-3 h-3" />
                            Истёк {new Date(u.accessUntil).toLocaleDateString('ru-RU')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setPaymentUser(u)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 hover:bg-yellow-400/40 hover:text-white"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Поступила оплата
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Роль */}
                    {isSuper && (
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                          disabled={u.role === 'SUPER'}
                          className="border border-purple-500/40 rounded-lg px-2 py-1 bg-purple-950/80 text-pink-200 text-xs focus:outline-none"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role} disabled={role === 'SUPER' && u.role !== 'SUPER'}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* Пл. материалы */}
                    <td className="px-4 py-3 text-center">
                      <button
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                        onClick={() => { setSelectedUser(u); setIsModalOpen(true) }}
                      >
                        <Package className="w-3.5 h-3.5" />
                        Управлять
                      </button>
                    </td>

                    {/* Профиль */}
                    <td className="px-4 py-3 text-center">
                      <button
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm"
                        onClick={() => handleCopyLink(u.id)}
                      >
                        <Link className="w-3.5 h-3.5" />
                        Профиль RU/EU
                      </button>
                    </td>

                    {/* Удалить */}
                    <td className="px-4 py-3 text-center">
                      <button
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white py-1.5 px-3 rounded-lg text-xs transition-all shadow-sm disabled:opacity-30"
                        onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true) }}
                        disabled={u.role === 'SUPER'}
                        title={u.role === 'SUPER' ? 'Нельзя удалить SUPER' : ''}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Удалить
                      </button>
                    </td>
                  </tr>
                )
              })}

              {processed.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-12 text-center">
                    <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">
                      {search || paymentFilter !== 'all' ? 'Нет пользователей по фильтру' : 'Нет пользователей'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-purple-900/90 border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h2 className="text-lg font-bold text-red-400 mb-3">Удалить пользователя?</h2>
            <div className="p-3 bg-purple-800/50 border border-purple-600/40 rounded-xl mb-4">
              <p className="font-semibold text-white">{userToDelete.firstName} {userToDelete.lastName}</p>
              {userToDelete.phoneNumber && (
                <p className="text-sm text-purple-300">{userToDelete.phoneNumber}</p>
              )}
            </div>
            <p className="text-red-300/80 text-sm mb-5">
              Будут удалены профиль, доступы к материалам и история. Действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null) }}
                disabled={isDeleting}
                className="px-4 py-2 text-purple-300 border border-purple-600/50 rounded-xl hover:bg-purple-800 disabled:opacity-50 transition text-sm"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl disabled:opacity-50 transition text-sm font-medium"
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
