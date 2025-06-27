'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  login: string
  role: string
}

export default function ProfileClient() {
  const params = useSearchParams()
  const token = params.get('token')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Токен отсутствует')
      return
    }
    fetch(`/api/profile-from-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setUser(data)
      })
      .catch(() => setError('Ошибка загрузки'))
  }, [token])

  if (error) return <div className='p-10 text-red-600'>{error}</div>
  if (!user) return <div className='p-10'>Загрузка...</div>

  const labelClass = 'text-blue-500 font-semibold w-32 text-right'
  const valueClass = 'text-gray-900 font-mono font-bold text-green-500'

  return (
    <div className='p-10 max-w-md mx-auto bg-indigo-800 rounded-2xl shadow'>
      <h1 className='text-2xl mb-6 font-bold text-center text-blue-500'>
        Ваш профиль
      </h1>
      <ul className='space-y-3'>
        <li className='flex'>
          <span className={labelClass}>Имя:</span>
          <span className={valueClass + ' ml-2'}>{user.firstName}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Фамилия:</span>
          <span className={valueClass + ' ml-2'}>{user.lastName}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Телефон:</span>
          <span className={valueClass + ' ml-2'}>{user.phoneNumber}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Email:</span>
          <span className={valueClass + ' ml-2'}>{user.email}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Логин:</span>
          <span className={valueClass + ' ml-2'}>{user.login}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Роль:</span>
          <span className={valueClass + ' ml-2'}>{user.role}</span>
        </li>
      </ul>
    </div>
  )
}
