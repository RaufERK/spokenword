// app/users/UsersTable.tsx

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

// app/users/UsersTable.tsx

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
    setList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, paymentDate } : u))
    )
  }

  // Новый хендлер для смены роли
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
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setList(prev => prev.filter(u => u.id !== userToDelete.id))
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
      <table className='min-w-full border border-slate-300 bg-white rounded-2xl'>
        <thead className='bg-slate-100'>
          <tr className='text-left'>
            <th className='px-2 py-2 w-8 text-gray-400'>№</th>
            <th className='px-3 py-2 text-black'>Имя</th>
            <th className='px-3 py-2 text-black'>Фамилия</th>
            <th className='px-3 py-2 text-black'>Телефон</th>
            <th className='px-3 py-2 text-black'>Логин</th>
            <th className='px-3 py-2 text-black'>Пароль</th>
            <th className='px-3 py-2 text-black'>Оплата</th>
            {isSuper && <th className='px-3 py-2 text-black'>Роль</th>}
            <th className='px-3 py-2 text-black'>Материалы</th>
            <th className='px-3 py-2 text-black'>Профиль</th>
            <th className='px-3 py-2 text-black'>Действия</th>
          </tr>
        </thead>
        <tbody>
          {list.map((u, i) => {
            const paid = !!u.paymentDate
            return (
              <tr key={u.id} className='border-t'>
                {/* ... остальные td ... */}
                <td className='px-2 py-1 text-gray-400 text-sm'>{i + 1}</td>
                <td className='px-3 py-1 text-black'>{u.firstName}</td>
                <td className='px-3 py-1 text-black'>{u.lastName}</td>
                <td className='px-3 py-1 font-mono text-gray-600'>
                  {u.phoneNumber}
                </td>
                <td className='px-3 py-1 font-mono text-gray-600'>{u.login}</td>
                <td className='px-3 py-1 font-mono text-gray-400'>
                  {u.password}
                </td>
                <td className='px-3 py-1'>
                  <label className='inline-flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={paid}
                      onChange={() => togglePaid(u.id, paid)}
                      className='accent-green-600 h-4 w-4'
                    />
                    {paid && (
                      <span className='text-xs text-slate-900'>
                        {new Date(u.paymentDate!).toLocaleDateString()}
                      </span>
                    )}
                  </label>
                </td>

                {/* Новый select для смены роли (только SUPER может менять) */}
                {isSuper && (
                  <td className='px-3 py-1'>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={u.role === 'SUPER'} // SUPER нельзя изменить
                      className='border rounded px-2 py-1 bg-white text-blue-700'
                    >
                      {ROLES.map((role) => (
                        <option
                          key={role}
                          value={role}
                          disabled={role === 'SUPER' && u.role !== 'SUPER'} // Только SUPER может оставаться SUPER
                        >
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className='px-3 py-1'>
                  <button
                    className='bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm'
                    onClick={() => handleManageAccess(u)}
                  >
                    Управлять
                  </button>
                </td>
                <td className='px-3 py-1'>
                  <button
                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                    onClick={() => handleCopyLink(u.id)}
                  >
                    профиль
                  </button>
                </td>
                <td className='px-3 py-1'>
                  <button
                    className='bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm'
                    onClick={() => handleDeleteUser(u)}
                    disabled={u.role === 'SUPER'} // Нельзя удалить SUPER админа
                    title={u.role === 'SUPER' ? 'Нельзя удалить SUPER админа' : 'Удалить пользователя'}
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

      {/* Модальное окно подтверждения удаления */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-red-600 mb-2">
                ⚠️ Подтверждение удаления
              </h2>
              <p className="text-gray-700">
                Вы действительно хотите удалить пользователя:
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded border">
                <p className="font-medium">
                  {userToDelete.firstName} {userToDelete.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  Логин: {userToDelete.login}
                </p>
                {userToDelete.phoneNumber && (
                  <p className="text-sm text-gray-600">
                    Телефон: {userToDelete.phoneNumber}
                  </p>
                )}
              </div>
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Это действие нельзя отменить!
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Будут удалены:
                </p>
                <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
                  <li>Профиль пользователя</li>
                  <li>Доступы к платным материалам</li>
                  <li>История покупок</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Удаление...' : 'Удалить пользователя'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
