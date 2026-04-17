'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, User, Mail, Phone, MapPin, Copy, Check, Globe } from 'lucide-react'

interface ApiOk {
  login: string
  password: string
}

const inputClass =
  'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400'

function validateName(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length < 3) return 'Минимум 3 символа'
  if (!/[а-яёА-ЯЁa-zA-Z]/.test(trimmed)) return 'Должны быть буквы'
  if (/^[^а-яёА-ЯЁa-zA-Z]+$/.test(trimmed)) return 'Только из спецсимволов — не подходит'
  return null
}

export default function RegisterPage() {
  const [result, setResult] = useState<ApiOk | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isAbroad, setIsAbroad] = useState(false)
  const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const fd = new FormData(e.currentTarget)
    const firstName = (fd.get('firstName') as string) ?? ''
    const lastName = (fd.get('lastName') as string) ?? ''

    const firstErr = validateName(firstName)
    const lastErr = validateName(lastName)
    if (firstErr || lastErr) {
      setNameErrors({ firstName: firstErr ?? undefined, lastName: lastErr ?? undefined })
      return
    }
    setNameErrors({})
    setLoading(true)

    const body = {
      ...Object.fromEntries(fd.entries()),
      isAbroad,
    }

    const r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (r.ok) {
      setResult(await r.json())
    } else if (r.status === 409) {
      const { fields } = await r.json()
      setError(
        fields?.includes('phoneNumber')
          ? 'Этот телефон уже зарегистрирован'
          : fields?.includes('email')
          ? 'Этот e-mail уже зарегистрирован'
          : 'Пользователь с такими данными уже существует'
      )
    } else if (r.status === 400) {
      setError('Проверьте правильность введённых данных')
    } else {
      setError('Ошибка сервера. Попробуйте позже')
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(`Логин: ${result.login}\nПароль: ${result.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">Регистрация завершена!</h2>
            <p className="text-gray-500 text-sm mb-6">Сохраните данные для входа</p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-left space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Логин</p>
                <p className="text-gray-900 font-semibold text-lg">{result.login}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Пароль</p>
                <p className="text-gray-900 font-semibold text-lg">{result.password}</p>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm mb-4"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано!' : 'Скопировать данные'}
            </button>

            <p className="text-xs text-gray-400 mb-6">
              Пароль можно будет напомнить у администратора.
            </p>

            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
            >
              Войти в аккаунт
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl text-gray-800 mb-2">Регистрация</h2>
            <p className="text-gray-500 text-sm">Создайте новый аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Имя */}
            <div>
              <label htmlFor="firstName" className="block text-gray-700 mb-1.5 text-sm font-medium">
                Имя <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Имя"
                  required
                  className={`${inputClass} ${nameErrors.firstName ? 'border-red-400 focus:ring-red-400' : ''}`}
                  onChange={() => setNameErrors((p) => ({ ...p, firstName: undefined }))}
                />
              </div>
              {nameErrors.firstName && (
                <p className="text-red-500 text-xs mt-1">{nameErrors.firstName}</p>
              )}
            </div>

            {/* Фамилия */}
            <div>
              <label htmlFor="lastName" className="block text-gray-700 mb-1.5 text-sm font-medium">
                Фамилия <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Фамилия"
                  required
                  className={`${inputClass} ${nameErrors.lastName ? 'border-red-400 focus:ring-red-400' : ''}`}
                  onChange={() => setNameErrors((p) => ({ ...p, lastName: undefined }))}
                />
              </div>
              {nameErrors.lastName && (
                <p className="text-red-500 text-xs mt-1">{nameErrors.lastName}</p>
              )}
            </div>

            {/* Телефон */}
            <div>
              <label htmlFor="phone" className="block text-gray-700 mb-1.5 text-sm font-medium">
                Телефон <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+7 999 123-45-67"
                  required
                  pattern="^\+?\d{8,15}$"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-gray-700 mb-1.5 text-sm font-medium">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="E-mail"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Город */}
            <div>
              <label htmlFor="city" className="block text-gray-700 mb-1.5 text-sm font-medium">
                Город
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Город"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Пользуюсь не из России */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={isAbroad}
                  onChange={(e) => setIsAbroad(e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-gray-800 font-medium text-sm">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Пользуюсь не из России
                </div>
                <p className="text-gray-400 text-xs mt-0.5">
                  Отметьте, если вы находитесь за пределами РФ
                </p>
              </div>
            </label>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-xl py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
            >
              <UserPlus className="w-5 h-5" />
              <span>{loading ? 'Регистрация...' : 'Зарегистрироваться'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 underline font-medium">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
