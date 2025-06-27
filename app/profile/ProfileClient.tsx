'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  login: string
  role: string
  password: string
}

export default function ProfileClient() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')
  const { data: session, status } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authTried, setAuthTried] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Токен отсутствует')
      return
    }
    setLoading(true)
    fetch(`/api/profile-from-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setUser(data)
      })
      .catch(() => setError('Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [token])

  // <-- вот тут автоматическая авторизация
  useEffect(() => {
    if (user && !session && !authTried && user.login && user.password) {
      setAuthTried(true)
      signIn('credentials', {
        login: user.login,
        password: user.password,
        redirect: false
      }).then((res) => {
        if (!res?.ok) setError('Не удалось авторизоваться')
        // Можно router.replace('/profile') чтобы убрать токен из URL
      })
    }
  }, [user, session, authTried])

  if (error) return <div className='p-10 text-red-600'>{error}</div>
  if (loading || !user || status === 'loading')
    return <div className='p-10'>Загрузка...</div>

  // Можно не показывать пароль после авторизации
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
        {/* Не показывай пароль, если пользователь уже залогинен */}
        {/* {!session && ( */}
        <li className='flex'>
          <span className={labelClass}>Пароль:</span>
          <span className={valueClass + ' ml-2'}>{user.password}</span>
        </li>
        {/* )} */}
        {user.role && (
          <li className='flex'>
            <span className={labelClass}>Роль:</span>
            <span className={valueClass + ' ml-2'}>{user.role}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
