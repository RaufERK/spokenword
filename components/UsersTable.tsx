'use client'

import { useState } from 'react'

export interface UserRow {
  id: number
  firstName: string
  lastName: string
  login: string
  password: string
  paymentDate: string | Date | null
  role: 'USER' | 'ADMIN' | 'SUPER'
}

export default function UsersTable({
  users,
  currentRole,
}: {
  users: UserRow[]
  currentRole: 'USER' | 'ADMIN' | 'SUPER'
}) {
  const [list, setList] = useState(users)
  const isSuper = currentRole === 'SUPER'

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

  const toggleAdmin = async (id: number, current: boolean) => {
    const res = await fetch(`/api/users/${id}/admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makeAdmin: !current }),
    })
    if (!res.ok) return alert('Не удалось обновить роль')
    const { role } = await res.json()
    setList((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
  }

  return (
    <div className='overflow-x-auto'>
      <table className='min-w-full border border-slate-300 bg-white'>
        <thead className='bg-slate-100'>
          <tr className='text-left'>
            <th className='px-3 py-2 text-black'>Имя</th>
            <th className='px-3 py-2 text-black'>Фамилия</th>
            <th className='px-3 py-2 text-black'>Логин</th>
            <th className='px-3 py-2 text-black'>Пароль</th>
            <th className='px-3 py-2 text-black'>Оплата</th>
            {isSuper && <th className='px-3 py-2 text-black'>Админ</th>}
          </tr>
        </thead>
        <tbody>
          {list.map((u) => {
            const paid = !!u.paymentDate
            const isAdmin = u.role === 'ADMIN'
            const isSuperUser = u.role === 'SUPER'
            return (
              <tr key={u.id} className='border-t'>
                <td className='px-3 py-1 text-black'>{u.firstName}</td>
                <td className='px-3 py-1 text-black'>{u.lastName}</td>
                <td className='px-3 py-1 font-mono text-black'>{u.login}</td>
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
                      <span className='text-xs text-slate-500'>
                        {new Date(u.paymentDate!).toLocaleDateString()}
                      </span>
                    )}
                  </label>
                </td>
                {isSuper && (
                  <td className='px-3 py-1'>
                    <label className='inline-flex items-center gap-2 cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={isAdmin}
                        onChange={() => toggleAdmin(u.id, isAdmin)}
                        disabled={isSuperUser}
                        className='accent-blue-600 h-4 w-4'
                      />
                      {isSuperUser && (
                        <span className='text-xs text-slate-500'>SUPER</span>
                      )}
                    </label>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
