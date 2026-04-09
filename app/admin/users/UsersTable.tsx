'use client'

import { ROLES, Role } from '@/lib/roles'
import { useState, useMemo } from 'react'
import UserAccessModal from '@/components/admin/UserAccessModal'
import PaymentModal from '@/components/admin/PaymentModal'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Trash2, Link, Package, CheckCircle, XCircle, PlusCircle, Users, X,
} from 'lucide-react'

export interface UserRow {
  id: number
  firstName: string
  lastName: string
  login: string
  password: string
  phoneNumber: string | null
  city: string | null
  paymentDate: string | null
  accessUntil: string | null
  role: Role
}

type SortField = 'name' | 'surname' | 'login' | 'city' | 'accessUntil' | 'role'
type SortDir = 'asc' | 'desc'
type PaymentFilter = 'all' | 'active' | 'inactive'

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
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('surname')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  const isSuper = currentRole === 'SUPER'

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
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
    else if (paymentFilter === 'inactive') result = result.filter((u) => !isAccessActive(u.accessUntil))

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

  const handleCopyLink = async (id: number) => {
    const res = await fetch(`/api/users/${id}/token`)
    const data = await res.json()
    if (!res.ok) return alert('Ошибка при создании ссылки')
    await navigator.clipboard.writeText(data.url)
  }

  const revokeAccess = async (id: number) => {
    const res = await fetch(`/api/users/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revoke: true }),
    })
    if (!res.ok) return alert('Не удалось отозвать доступ')
    setList((prev) => prev.map((u) => (u.id === id ? { ...u, accessUntil: null, paymentDate: null } : u)))
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

  const totalActive = list.filter((u) => isAccessActive(u.accessUntil)).length

  const colCount = isSuper
    ? 10 // №, Имя, Фамилия, Телефон, Логин, Город, Оплата, Роль, Пл.материалы, Профиль, Удалить — но считаем без №
    : 9

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
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

        <div className="flex gap-1 bg-purple-900/40 p-1 rounded-xl border border-purple-400/20 self-start">
          {(['all', 'active', 'inactive'] as PaymentFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPaymentFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                paymentFilter === f ? 'bg-pink-600 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {f === 'all'
                ? `Все (${list.length})`
                : f === 'active'
                ? `Активные (${totalActive})`
                : `Неактивные (${list.length - totalActive})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-pink-400/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-pink-700 to-purple-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-white w-8">№</th>
                <SortableTh field="name"        label="Имя"      current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="surname"     label="Фамилия"  current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-sm text-white">Телефон</th>
                <SortableTh field="login"       label="Логин"    current={sortField} dir={sortDir} onSort={handleSort} />
                <SortableTh field="city"        label="Город"    current={sortField} dir={sortDir} onSort={handleSort} />
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
                const hasAccess = !!u.accessUntil
                return (
                  <tr
                    key={u.id}
                    className="border-t border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-white/40 text-sm">{i + 1}</td>
                    <td className="px-4 py-3 text-white text-sm">{u.firstName}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{u.lastName}</td>
                    <td className="px-4 py-3 text-pink-200 text-sm font-mono">{u.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-blue-300 text-sm font-mono">{u.login}</td>
                    <td className="px-4 py-3 text-white/70 text-sm">{u.city || '—'}</td>

                    {/* Доступ */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {active ? (
                          <button
                            onClick={() => revokeAccess(u.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                            title="Нажмите чтобы отозвать"
                          >
                            <CheckCircle className="w-3 h-3" />
                            до {new Date(u.accessUntil!).toLocaleDateString('ru-RU')}
                          </button>
                        ) : hasAccess ? (
                          <button
                            onClick={() => setPaymentUser(u)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30"
                          >
                            <XCircle className="w-3 h-3" />
                            Истёк {new Date(u.accessUntil!).toLocaleDateString('ru-RU')}
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
                        Профиль
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
                  <td colSpan={isSuper ? 11 : 10} className="py-12 text-center">
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
          onSave={({ paymentDate, accessUntil }) => {
            setList((prev) =>
              prev.map((u) => (u.id === paymentUser.id ? { ...u, paymentDate, accessUntil } : u))
            )
            setPaymentUser(null)
          }}
        />
      )}

      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-purple-900/90 border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h2 className="text-lg font-bold text-red-400 mb-3">Удалить пользователя?</h2>
            <div className="p-3 bg-purple-800/50 border border-purple-600/40 rounded-xl mb-4">
              <p className="font-semibold text-white">
                {userToDelete.firstName} {userToDelete.lastName}
              </p>
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
