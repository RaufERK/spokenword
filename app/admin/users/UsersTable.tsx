'use client'

import { ROLES, Role } from '@/lib/roles'
import { useState, useMemo } from 'react'
import UserAccessModal from '@/components/admin/UserAccessModal'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Link, Package, CheckCircle, XCircle } from 'lucide-react'

export interface UserRow {
  id: number
  firstName: string
  lastName: string
  login: string
  password: string
  phoneNumber: string | null
  paymentDate: string | Date | null
  role: Role
}

type SortField = 'name' | 'surname' | 'paymentDate' | 'role'
type SortDir = 'asc' | 'desc'
type PaymentFilter = 'all' | 'active' | 'inactive'

const PAYMENT_WINDOW_DAYS = 30

function isPaymentActive(paymentDate: string | Date | null): boolean {
  if (!paymentDate) return false
  const d = new Date(paymentDate)
  const now = new Date()
  return now.getTime() - d.getTime() < PAYMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="w-3.5 h-3.5 text-pink-400/40" />
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-pink-300" />
    : <ChevronDown className="w-3.5 h-3.5 text-pink-300" />
}

export default function UsersTable({
  users,
  currentRole,
}: {
  users: UserRow[]
  currentRole: Role
}) {
  const [list, setList] = useState(users)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('surname')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')

  const isSuper = currentRole === 'SUPER'

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const processed = useMemo(() => {
    let result = [...list]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          (u.phoneNumber && u.phoneNumber.includes(q))
      )
    }

    // Payment filter
    if (paymentFilter === 'active') {
      result = result.filter((u) => isPaymentActive(u.paymentDate))
    } else if (paymentFilter === 'inactive') {
      result = result.filter((u) => !isPaymentActive(u.paymentDate))
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') cmp = a.firstName.localeCompare(b.firstName, 'ru')
      else if (sortField === 'surname') cmp = a.lastName.localeCompare(b.lastName, 'ru')
      else if (sortField === 'paymentDate') {
        const da = a.paymentDate ? new Date(a.paymentDate).getTime() : 0
        const db = b.paymentDate ? new Date(b.paymentDate).getTime() : 0
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
    alert('Ссылка скопирована!')
  }

  const togglePaid = async (id: number, current: boolean) => {
    const res = await fetch(`/api/users/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: !current }),
    })
    if (!res.ok) return alert('Не удалось обновить оплату')
    const { paymentDate } = await res.json()
    setList((prev) => prev.map((u) => (u.id === id ? { ...u, paymentDate } : u)))
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

  const totalActive = list.filter((u) => isPaymentActive(u.paymentDate)).length

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, телефону..."
            className="w-full bg-pink-900/30 border border-pink-700/50 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-pink-400/40 focus:outline-none focus:border-pink-500/60"
          />
        </div>

        {/* Payment filter */}
        <div className="flex gap-1 bg-pink-900/30 p-1 rounded-xl border border-pink-700/50 self-start">
          {(['all', 'active', 'inactive'] as PaymentFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPaymentFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                paymentFilter === f
                  ? 'bg-pink-600 text-white'
                  : 'text-pink-300/60 hover:text-pink-200'
              }`}
            >
              {f === 'all' ? `Все (${list.length})` : f === 'active' ? `Активные (${totalActive})` : `Неактивные (${list.length - totalActive})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-pink-700/40">
        <table className="min-w-full bg-pink-900/30 backdrop-blur-sm">
          <thead className="bg-pink-800/60">
            <tr>
              <th className="px-2 py-3 w-8 text-pink-300 text-xs text-left">№</th>

              <th
                className="px-3 py-3 text-left cursor-pointer select-none group"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1 text-pink-200 text-xs font-medium">
                  Имя
                  <SortIcon field="name" current={sortField} dir={sortDir} />
                </div>
              </th>

              <th
                className="px-3 py-3 text-left cursor-pointer select-none"
                onClick={() => handleSort('surname')}
              >
                <div className="flex items-center gap-1 text-pink-200 text-xs font-medium">
                  Фамилия
                  <SortIcon field="surname" current={sortField} dir={sortDir} />
                </div>
              </th>

              <th className="px-3 py-3 text-pink-200 text-xs font-medium text-left">Телефон</th>
              <th className="px-3 py-3 text-pink-200 text-xs font-medium text-left">Логин</th>

              <th
                className="px-3 py-3 text-left cursor-pointer select-none"
                onClick={() => handleSort('paymentDate')}
              >
                <div className="flex items-center gap-1 text-pink-200 text-xs font-medium">
                  Оплата
                  <SortIcon field="paymentDate" current={sortField} dir={sortDir} />
                </div>
              </th>

              {isSuper && (
                <th
                  className="px-3 py-3 text-left cursor-pointer select-none"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center gap-1 text-pink-200 text-xs font-medium">
                    Роль
                    <SortIcon field="role" current={sortField} dir={sortDir} />
                  </div>
                </th>
              )}

              <th className="px-3 py-3 text-pink-200 text-xs font-medium text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {processed.map((u, i) => {
              const paid = !!u.paymentDate
              const active = isPaymentActive(u.paymentDate)
              return (
                <tr
                  key={u.id}
                  className="border-t border-pink-700/20 hover:bg-pink-800/20 transition-colors"
                >
                  <td className="px-2 py-2.5 text-pink-400/60 text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5 text-white text-sm">{u.firstName}</td>
                  <td className="px-3 py-2.5 text-white text-sm font-medium">{u.lastName}</td>
                  <td className="px-3 py-2.5 text-pink-300 text-sm font-mono">{u.phoneNumber || '—'}</td>
                  <td className="px-3 py-2.5 text-blue-300 text-sm font-mono">{u.login}</td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePaid(u.id, paid)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                          active
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                            : paid
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                            : 'bg-white/5 text-white/30 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {active ? (
                          <><CheckCircle className="w-3 h-3" /> Активна</>
                        ) : paid ? (
                          <><XCircle className="w-3 h-3" /> Истекла</>
                        ) : (
                          '—'
                        )}
                      </button>
                      {paid && (
                        <span className="text-xs text-pink-400/60">
                          {new Date(u.paymentDate!).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </td>

                  {isSuper && (
                    <td className="px-3 py-2.5">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        disabled={u.role === 'SUPER'}
                        className="border border-pink-600/60 rounded-lg px-2 py-1 bg-pink-950/80 text-pink-200 text-xs focus:outline-none"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role} disabled={role === 'SUPER' && u.role !== 'SUPER'}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        className="flex items-center gap-1 bg-green-600/70 hover:bg-green-600 text-white py-1 px-2 rounded-lg text-xs transition"
                        onClick={() => { setSelectedUser(u); setIsModalOpen(true) }}
                        title="Управление материалами"
                      >
                        <Package className="w-3 h-3" />
                        <span className="hidden sm:inline">Материалы</span>
                      </button>
                      <button
                        className="flex items-center gap-1 bg-blue-600/70 hover:bg-blue-600 text-white py-1 px-2 rounded-lg text-xs transition"
                        onClick={() => handleCopyLink(u.id)}
                        title="Скопировать ссылку на профиль"
                      >
                        <Link className="w-3 h-3" />
                        <span className="hidden sm:inline">Профиль</span>
                      </button>
                      <button
                        className="flex items-center gap-1 bg-red-600/60 hover:bg-red-600 text-white py-1 px-2 rounded-lg text-xs transition disabled:opacity-30"
                        onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true) }}
                        disabled={u.role === 'SUPER'}
                        title={u.role === 'SUPER' ? 'Нельзя удалить SUPER' : 'Удалить'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {processed.length === 0 && (
              <tr>
                <td colSpan={isSuper ? 8 : 7} className="text-center py-8 text-pink-400/40 text-sm">
                  {search || paymentFilter !== 'all' ? 'Нет пользователей по фильтру' : 'Нет пользователей'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserAccessModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedUser(null) }}
        onSave={() => { setIsModalOpen(false); setSelectedUser(null) }}
      />

      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-pink-900/90 border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4">
            <h2 className="text-lg font-bold text-red-400 mb-3">Удалить пользователя?</h2>
            <div className="p-3 bg-pink-800/50 border border-pink-600/40 rounded-xl mb-4">
              <p className="font-semibold text-white">
                {userToDelete.firstName} {userToDelete.lastName}
              </p>
              {userToDelete.phoneNumber && (
                <p className="text-sm text-pink-300">{userToDelete.phoneNumber}</p>
              )}
            </div>
            <p className="text-red-300/80 text-sm mb-5">
              Будут удалены профиль, доступы к материалам и история. Действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null) }}
                disabled={isDeleting}
                className="px-4 py-2 text-pink-300 border border-pink-600/50 rounded-xl hover:bg-pink-800 disabled:opacity-50 transition text-sm"
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
