'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, User, Mail, Phone, MapPin, Copy, Check } from 'lucide-react'

interface ApiOk {
  login: string
  password: string
}

const inputClass =
  'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400'

const fields = [
  { name: 'firstName', label: 'Имя', placeholder: 'Имя', icon: User, type: 'text', required: true },
  { name: 'lastName', label: 'Фамилия', placeholder: 'Фамилия', icon: User, type: 'text', required: true },
  { name: 'phone', label: 'Телефон', placeholder: '+1234567890', icon: Phone, type: 'tel', required: true, pattern: '^\\+\\d{8,15}$' },
  { name: 'email', label: 'E-mail', placeholder: 'E-mail', icon: Mail, type: 'email', required: false },
  { name: 'city', label: 'Город', placeholder: 'Город', icon: MapPin, type: 'text', required: false },
]

export default function RegisterPage() {
  const [result, setResult] = useState<ApiOk | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body = Object.fromEntries(new FormData(e.currentTarget).entries())

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
          : 'Пользователь с такими данными уже существует'
      )
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
            {fields.map(({ name, label, placeholder, icon: Icon, type, required, pattern }) => (
              <div key={name}>
                <label htmlFor={name} className="block text-gray-700 mb-1.5 text-sm font-medium">
                  {label}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    required={required}
                    pattern={pattern}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}

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
