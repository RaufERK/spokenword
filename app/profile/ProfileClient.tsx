'use client'

import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, type ElementType } from 'react'
import { User, Mail, Phone, Key, Shield, MapPin, Save, X, RefreshCw } from 'lucide-react'
import { formatPhone } from '@/helpers/phone'

interface UserProfile {
  id: number | string
  firstName: string
  lastName: string
  phoneNumber: string | null
  email?: string | null
  city?: string | null
  login: string
  role: string
  password?: string
}

type ProfileForm = {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  city: string
}

type ProfileResponse = {
  user?: UserProfile
  error?: string
  fields?: string[]
}

type FieldDef = {
  label: string
  icon: ElementType
  value: (p: UserProfile) => string | undefined | null
  show?: (p: UserProfile, hasToken: boolean) => boolean
}

const FIELDS: FieldDef[] = [
  { label: 'Имя', icon: User, value: (p) => p.firstName },
  { label: 'Фамилия', icon: User, value: (p) => p.lastName },
  { label: 'Телефон', icon: Phone, value: (p) => formatPhone(p.phoneNumber) },
  { label: 'Email', icon: Mail, value: (p) => p.email },
  { label: 'Город', icon: MapPin, value: (p) => p.city },
  { label: 'Логин', icon: Key, value: (p) => p.login },
  { label: 'Пароль', icon: Shield, value: (p) => p.password },
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

function getInitialForm(profile: UserProfile): ProfileForm {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    email: profile.email ?? '',
    city: profile.city ?? '',
  }
}

function getErrorMessage(error: string, fields?: string[]) {
  if (error === 'firstName') return 'Проверьте имя'
  if (error === 'lastName') return 'Проверьте фамилию'
  if (error === 'phoneNumber') return 'Проверьте номер телефона'
  if (error === 'email') return 'Проверьте email'
  if (error === 'newPassword') return 'Новый пароль должен быть не короче 6 символов'
  if (error === 'currentPassword') return 'Текущий пароль указан неверно'
  if (error === 'profileMismatch') return 'Открыт один профиль, а в браузере активна другая учётная запись. Обновите страницу или войдите заново по ссылке профиля.'
  if (error === 'duplicate') {
    if (fields?.includes('phoneNumber')) return 'Такой телефон уже указан у другого пользователя'
    if (fields?.includes('email')) return 'Такой email уже указан у другого пользователя'
    return 'Такие данные уже используются'
  }
  return 'Не удалось сохранить профиль'
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-purple-300/80 text-sm">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-purple-300/60 focus:bg-white/15 placeholder:text-white/30"
      />
    </label>
  )
}

export default function ProfileClient() {
  const params = useSearchParams()
  const token = params?.get('token') ?? null
  const { data: session, status, update } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authTried, setAuthTried] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [generatingPassword, setGeneratingPassword] = useState(false)
  const [latestPassword, setLatestPassword] = useState<string | null>(null)

  useEffect(() => {
    if (!token || authTried || status === 'loading') return

    setAuthTried(true)
    setIsAuthorizing(true)
    signIn('credentials', { magicToken: token, redirect: false })
      .then(async (result) => {
        if (result?.error) {
          setError('Ошибка авторизации')
          return
        }
        await update()
      })
      .catch(() => setError('Ошибка авторизации'))
      .finally(() => setIsAuthorizing(false))
  }, [token, authTried, status, update])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return

    let cancelled = false
    fetch('/api/profile')
      .then((res) => res.json() as Promise<ProfileResponse>)
      .then((data) => {
        if (cancelled || !data.user) return
        setUser(data.user)
      })
      .catch(() => {
        // Keep the session profile even if password lookup fails.
      })

    return () => {
      cancelled = true
    }
  }, [status, session?.user?.id])

  const sessionProfile = session?.user as UserProfile | undefined
  const profile = user ?? sessionProfile
  const canEditProfile =
    !!sessionProfile && !!profile && String(sessionProfile.id) === String(profile.id)

  const [form, setForm] = useState<ProfileForm>(() => ({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    city: '',
  }))

  useEffect(() => {
    if (!profile || isEditing) return
    setForm(getInitialForm(profile))
  }, [
    profile?.id,
    profile?.firstName,
    profile?.lastName,
    profile?.phoneNumber,
    profile?.email,
    profile?.city,
    isEditing,
  ])

  const updateForm = (key: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormError(null)
    setSavedMessage(null)
  }

  const handleCancel = () => {
    if (profile) setForm(getInitialForm(profile))
    setIsEditing(false)
    setFormError(null)
    setSavedMessage(null)
  }

  const handleGeneratePassword = async () => {
    if (!profile || !canEditProfile) return
    if (!confirm('Сгенерировать новый пароль? Старые ссылки профиля перестанут работать.')) return

    setGeneratingPassword(true)
    setFormError(null)
    setSavedMessage(null)

    try {
      const res = await fetch('/api/profile/password', { method: 'POST' })
      const data = (await res.json()) as { password?: string; login?: string; error?: string }
      if (!res.ok || !data.password || !data.login) {
        setFormError('Не удалось сгенерировать пароль')
        return
      }

      setUser((prev) => prev ? { ...prev, password: data.password } : prev)

      setLatestPassword(data.password)

      const signInResult = await signIn('credentials', {
        login: data.login,
        password: data.password,
        redirect: false,
      })
      if (signInResult?.error) {
        setFormError('Пароль сохранён, но сессия не обновилась. Войдите с новым паролем.')
        return
      }

      await update()
      setSavedMessage('Новый пароль сохранён. Старые ссылки профиля больше не работают.')
    } catch {
      setFormError('Не удалось сгенерировать пароль')
    } finally {
      setGeneratingPassword(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    if (!canEditProfile) {
      setFormError(getErrorMessage('profileMismatch'))
      return
    }

    setSaving(true)
    setFormError(null)
    setSavedMessage(null)

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
          email: form.email,
          city: form.city,
        }),
      })
      const data = (await res.json()) as ProfileResponse

      if (!res.ok || !data.user) {
        setFormError(getErrorMessage(data.error ?? 'server', data.fields))
        return
      }

      setUser((prev) => prev && String(prev.id) === String(data.user?.id)
        ? { ...prev, ...data.user }
        : prev
      )

      await update()

      setForm({
        ...getInitialForm({
          ...profile,
          ...data.user,
        }),
      })
      setIsEditing(false)
      setSavedMessage('Профиль сохранён')
    } catch {
      setFormError('Не удалось сохранить профиль')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="p-10 text-red-400 text-center">{error}</div>
  if (token && (status === 'loading' || isAuthorizing))
    return <div className="p-10 text-white/50 text-center">Загрузка...</div>

  if (!profile)
    return (
      <div className="p-10 text-center text-white/50">
        Вы не авторизованы.{' '}
        <a href="/login" className="text-blue-400 underline">Войти</a>
      </div>
    )

  const hasToken = !!token
  const isAuthorizingTokenProfile = hasToken && (!authTried || isAuthorizing)

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

        <div className="p-8">
          {!isEditing ? (
            <>
              {savedMessage && (
                <div className="mb-6 rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-3 text-green-200">
                  {savedMessage}
                </div>
              )}

              {formError && !isEditing && (
                <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-200">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {FIELDS.map(({ label, icon: Icon, value, show }) => {
                  if (show && !show(profile, hasToken)) return null
                  const val = value(profile)
                  if (label === 'Пароль') {
                    return (
                      <div key={label} className="space-y-1.5">
                        <label className="flex items-center gap-2 text-purple-300/80 text-sm">
                          <Icon className="w-4 h-4" />
                          <span>{label}:</span>
                        </label>
                        <div className="pl-6 flex flex-wrap items-center gap-3">
                          <p className="text-green-400 text-lg font-medium font-mono tracking-widest">
                            {latestPassword || val || <span className="text-white/30 text-base">—</span>}
                          </p>
                          {canEditProfile && (
                            <button
                              type="button"
                              onClick={handleGeneratePassword}
                              disabled={generatingPassword}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-pink-600/80 hover:bg-pink-500 px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${generatingPassword ? 'animate-spin' : ''}`} />
                              {generatingPassword ? 'Генерируем...' : 'Сгенерировать пароль'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }
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

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={!canEditProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-medium text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <User className="w-4 h-4" />
                  {isAuthorizingTokenProfile ? 'Авторизуем профиль...' : 'Редактировать профиль'}
                </button>
              </div>

              {!canEditProfile && !isAuthorizingTokenProfile && (
                <div className="mt-4 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-yellow-100">
                  Этот профиль открыт по ссылке, но в браузере активна другая учётная запись.
                  Обновите страницу или откройте ссылку профиля заново.
                </div>
              )}
            </>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TextInput
                  label="Имя"
                  value={form.firstName}
                  autoComplete="given-name"
                  onChange={(value) => updateForm('firstName', value)}
                />
                <TextInput
                  label="Фамилия"
                  value={form.lastName}
                  autoComplete="family-name"
                  onChange={(value) => updateForm('lastName', value)}
                />
                <TextInput
                  label="Телефон"
                  value={form.phoneNumber}
                  autoComplete="tel"
                  placeholder="+7 999 123-45-67"
                  onChange={(value) => updateForm('phoneNumber', value)}
                />
                <TextInput
                  label="Email"
                  value={form.email}
                  type="email"
                  autoComplete="email"
                  onChange={(value) => updateForm('email', value)}
                />
                <TextInput
                  label="Город"
                  value={form.city}
                  autoComplete="address-level2"
                  onChange={(value) => updateForm('city', value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <span className="block text-purple-300/80 text-sm">Логин</span>
                    <input
                      value={profile.login}
                      disabled
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/50 outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-purple-300/80 text-sm">Роль</span>
                    <input
                      value={profile.role}
                      disabled
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/50 outline-none"
                    />
                  </label>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-200">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-medium text-white transition hover:bg-green-400 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
