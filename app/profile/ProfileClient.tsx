'use client'

import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { User, Mail, Phone, Key, Shield } from 'lucide-react'

interface UserProfile {
  id: number
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  login: string
  role: string
  password?: string
}

type FieldDef = {
  label: string
  icon: React.ElementType
  value: (p: UserProfile) => string | undefined | null
  show?: (p: UserProfile, hasToken: boolean) => boolean
}

const FIELDS: FieldDef[] = [
  { label: 'Имя', icon: User, value: (p) => p.firstName },
  { label: 'Фамилия', icon: User, value: (p) => p.lastName },
  { label: 'Телефон', icon: Phone, value: (p) => p.phoneNumber },
  { label: 'Email', icon: Mail, value: (p) => p.email },
  { label: 'Логин', icon: Key, value: (p) => p.login },
  {
    label: 'Пароль',
    icon: Shield,
    value: (p) => p.password,
    show: (p, hasToken) => hasToken && !!p.password,
  },
  { label: 'Роль', icon: Shield, value: (p) => p.role },
]

function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'SUPER': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'ADMIN': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'MODERATOR': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  }
}

export default function ProfileClient() {
  const params = useSearchParams()
  const token = params?.get('token') ?? null
  const { data: session, status } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authTried, setAuthTried] = useState(false)

  useEffect(() => {
    if (!token) return
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

  useEffect(() => {
    if (user && !session && !authTried && user.login && user.password) {
      setAuthTried(true)
      signIn('credentials', { login: user.login, password: user.password, redirect: false })
    }
  }, [user, session, authTried])

  if (error) return <div className="p-10 text-red-400 text-center">{error}</div>
  if (token && (loading || !user || status === 'loading'))
    return <div className="p-10 text-white/50 text-center">Загрузка...</div>

  const profile = user || (session?.user as UserProfile | undefined)

  if (!profile)
    return (
      <div className="p-10 text-center text-white/50">
        Вы не авторизованы.{' '}
        <a href="/login" className="text-blue-400 underline">Войти</a>
      </div>
    )

  const hasToken = !!token && !!user

  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl text-white mb-2">Ваш профиль</h1>
        <p className="text-purple-200/70">Личная информация и настройки аккаунта</p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/40 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">

        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-700/50 to-purple-700/50 p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-2xl text-white font-semibold">
                {profile.firstName} {profile.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-purple-200/70 text-sm">@{profile.login}</p>
                {profile.role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeClass(profile.role)}`}>
                    {profile.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fields grid */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FIELDS.map(({ label, icon: Icon, value, show }) => {
              if (show && !show(profile, hasToken)) return null
              const val = value(profile)
              return (
                <div key={label} className="space-y-1.5">
                  <label className="flex items-center gap-2 text-purple-300/80 text-sm">
                    <Icon className="w-4 h-4" />
                    <span>{label}:</span>
                  </label>
                  <p className="text-green-400 text-lg pl-6 font-medium">
                    {val || <span className="text-white/30 text-base">—</span>}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="pt-6 mt-2 border-t border-white/10">
            <button
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 px-8 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              onClick={() => alert('Редактирование профиля — в разработке')}
            >
              Редактировать профиль
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
