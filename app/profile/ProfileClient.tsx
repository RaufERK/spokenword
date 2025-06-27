'use client'

import { signIn, useSession } from 'next-auth/react'
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
  password?: string // опционально
}

export default function ProfileClient() {
  const params = useSearchParams()
  const token = params.get('token')
  const { data: session, status } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authTried, setAuthTried] = useState(false)

  // Если есть токен — грузим профиль по токену
  useEffect(() => {
    if (!token) return // Если токена нет — ничего не делаем тут
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

  // Если user получен по токену, а сессии нет — авторизуемся по логину/паролю (автоматически)
  useEffect(() => {
    if (user && !session && !authTried && user.login && user.password) {
      setAuthTried(true)
      signIn('credentials', {
        login: user.login,
        password: user.password,
        redirect: false,
      }).then((res) => {
        if (!res?.ok) setError('Не удалось авторизоваться')
        // router.replace('/profile') — убрать токен из url если надо
      })
    }
  }, [user, session, authTried])

  // Логика показа:
  // 1. Если есть ошибка — показываем её
  // 2. Если токен есть — ждём загрузки user (и авторизации)
  // 3. Если нет токена, но есть сессия — показываем user из сессии
  // 4. Если нет ничего — просим войти

  if (error) return <div className='p-10 text-red-600'>{error}</div>
  if (token && (loading || !user || status === 'loading'))
    return <div className='p-10'>Загрузка...</div>

  // Если нет токена, но есть сессия — показываем профиль из сессии
  const profile = user || session?.user

  if (!profile)
    return <div className='p-10 text-red-600'>Вы не авторизованы</div>

  // Можно не показывать пароль, если пользователь уже залогинен обычным способом
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
          <span className={valueClass + ' ml-2'}>{profile.firstName}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Фамилия:</span>
          <span className={valueClass + ' ml-2'}>{profile.lastName}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Телефон:</span>
          <span className={valueClass + ' ml-2'}>{profile.phoneNumber}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Email:</span>
          <span className={valueClass + ' ml-2'}>{profile.email}</span>
        </li>
        <li className='flex'>
          <span className={labelClass}>Логин:</span>
          <span className={valueClass + ' ml-2'}>{profile.login}</span>
        </li>
        {token && session && 'password' in profile && !!profile.password && (
          <li className='flex'>
            <span className={labelClass}>Пароль:</span>
            <span className={valueClass + ' ml-2'}>{profile.password}</span>
          </li>
        )}
        {profile.role && (
          <li className='flex'>
            <span className={labelClass}>Роль:</span>
            <span className={valueClass + ' ml-2'}>{profile.role}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
