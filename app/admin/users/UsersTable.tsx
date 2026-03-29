'use client'

import { ROLES, Role } from '@/lib/roles'
import { useState } from 'react'
import UserAccessModal from '@/components/admin/UserAccessModal'

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
  const isSuper = currentRole === 'SUPER'

  const handleCopyLink = async (id: number) => {
    const res = await fetch(`/api/users/${id}/token`)
    const data = await res.json()
    if (!res.ok) return alert('Ошибка при создании ссылки')
    await navigator.clipboard.writeText(data.url)
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

  const handleManageAccess = (user: UserRow) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  const handleDeleteUser = (user: UserRow) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
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

  const cancelDelete = () => {
    setIsDeleteModalOpen(false)
    setUserToDelete(null)
  }

  return (
    <div className='overflow-x-auto rounded-2xl'>
      <table className='min-w-full bg-pink-900/40 backdrop-blur-sm border border-pink-700/50 rounded-2xl'>
        <thead className='bg-pink-800/60'>
          <tr className='text-left'>
            <th className='px-2 py-3 w-8 text-pink-300 text-sm'>№</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Имя</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Фамилия</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Телефон</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Логин</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Пароль</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Оплата</th>
            {isSuper && <th className='px-3 py-3 text-pink-200 text-sm'>Роль</th>}
            <th className='px-3 py-3 text-pink-200 text-sm'>Материалы</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Профиль</th>
            <th className='px-3 py-3 text-pink-200 text-sm'>Действия</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u, i) => {
            const paid = !!u.paymentDate
            return (
              <tr key={u.id} className='border-t border-pink-700/30 hover:bg-pink-800/20 transition-colors'>
                <td className='px-2 py-2 text-pink-400 text-sm'>{i + 1}</td>
                <td className='px-3 py-2 text-white'>{u.firstName}</td>
                <td className='px-3 py-2 text-white'>{u.lastName}</td>
                <td className='px-3 py-2 font-mono text-pink-300 text-sm'>{u.phoneNumber}</td>
                <td className='px-3 py-2 font-mono text-blue-300 text-sm'>{u.login}</td>
                <td className='px-3 py-2 font-mono text-pink-400 text-xs'>{u.password}</td>
                <td className='px-3 py-2'>
                  <label className='inline-flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={paid}
                      onChange={() => togglePaid(u.id, paid)}
                      className='accent-green-500 h-4 w-4'
                    />
                    {paid && (
                      <span className='text-xs text-green-400'>
                        {new Date(u.paymentDate!).toLocaleDateString()}
                      </span>
                    )}
                  </label>
                </td>
                {isSuper && (
                  <td className='px-3 py-2'>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={u.role === 'SUPER'}
                      className='border border-pink-600 rounded px-2 py-1 bg-pink-950 text-pink-200 text-sm'
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role} disabled={role === 'SUPER' && u.role !== 'SUPER'}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className='px-3 py-2'>
                  <button
                    className='bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-lg text-sm transition'
                    onClick={() => handleManageAccess(u)}
                  >
                    Управлять
                  </button>
                </td>
                <td className='px-3 py-2'>
                  <button
                    className='bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg text-sm transition'
                    onClick={() => handleCopyLink(u.id)}
                  >
                    Профиль
                  </button>
                </td>
                <td className='px-3 py-2'>
                  <button
                    className='bg-red-600/80 hover:bg-red-600 text-white py-1 px-3 rounded-lg text-sm transition disabled:opacity-40'
                    onClick={() => handleDeleteUser(u)}
                    disabled={u.role === 'SUPER'}
                    title={u.role === 'SUPER' ? 'Нельзя удалить SUPER' : 'Удалить'}
                  >
                    {u.role === 'SUPER' ? '🔒' : '🗑️'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <UserAccessModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalClose}
      />

      {isDeleteModalOpen && userToDelete && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-pink-900 border border-red-500/40 rounded-xl p-6 w-full max-w-md shadow-2xl'>
            <h2 className='text-xl font-bold text-red-400 mb-3'>⚠️ Подтверждение удаления</h2>
            <p className='text-pink-200 text-sm mb-3'>Вы действительно хотите удалить пользователя:</p>
            <div className='p-3 bg-pink-800/50 border border-pink-600/40 rounded-lg mb-4'>
              <p className='font-semibold text-white'>
                {userToDelete.firstName} {userToDelete.lastName}
              </p>
              <p className='text-sm text-pink-300'>Логин: {userToDelete.login}</p>
              {userToDelete.phoneNumber && (
                <p className='text-sm text-pink-300'>Тел: {userToDelete.phoneNumber}</p>
              )}
            </div>
            <div className='p-3 bg-red-900/30 border border-red-500/30 rounded-lg mb-5'>
              <p className='text-red-300 text-sm font-medium mb-1'>⚠️ Это действие нельзя отменить!</p>
              <ul className='text-red-300/80 text-sm list-disc list-inside space-y-0.5'>
                <li>Профиль пользователя</li>
                <li>Доступы к платным материалам</li>
                <li>История покупок</li>
              </ul>
            </div>
            <div className='flex justify-end gap-3'>
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className='px-4 py-2 text-pink-300 border border-pink-600 rounded-lg hover:bg-pink-800 disabled:opacity-50 transition text-sm'
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition text-sm font-medium'
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
