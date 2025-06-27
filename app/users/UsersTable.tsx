// app/users/UsersTable.tsx

'use client'

import { ROLES, Role } from '@/lib/roles'
import { useState } from 'react'

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
            <th className='px-3 py-2 text-black'>Профиль</th>
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
                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                    onClick={() => handleCopyLink(u.id)}
                  >
                    профиль
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
