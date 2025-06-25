'use client'

import { useState } from 'react'

interface ApiOk {
  login: string
  password: string
}

const myStyle =
  'w-full border border-stone-200 rounded p-2 mb-3 text-black placeholder-gray-500'

export default function RegisterPage() {
  const [result, setResult] = useState<ApiOk | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const body = Object.fromEntries(new FormData(form).entries())

    const r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

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

  if (result) {
    return (
      <div className='max-w-md mx-auto p-6 bg-green-100 rounded-xl mt-10'>
        <h2 className='text-xl font-bold mb-4 text-black'>Успех!</h2>

        <p className={myStyle}>
          Ваш&nbsp;логин:&nbsp;<b>{result.login}</b>
        </p>
        <p className={myStyle}>
          Пароль:&nbsp;<b>{result.password}</b>
        </p>

        <p className='text-sm text-gray-700'>
          Сохраните данные. Пароль можно будет напомнить у администратора.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-sm mx-auto mt-20 p-6 bg-white border border-blue-500 text-gray-900 rounded shadow-lg space-y-4'
    >
      <input name='firstName' placeholder='Имя' required className={myStyle} />

      <input
        name='lastName'
        placeholder='Фамилия'
        required
        className={myStyle}
      />

      {/* международный номер телефона */}
      <input
        name='phone'
        placeholder='+1234567890'
        required
        pattern='^\+\d{8,15}$'
        className={myStyle}
      />

      <input
        name='email'
        type='email'
        placeholder='E-mail'
        className={myStyle}
      />

      <input name='city' placeholder='Город' className={myStyle} />

      {error && <p className='text-red-600 text-sm'>{error}</p>}

      <button className='w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 font-semibold'>
        Зарегистрироваться
      </button>
    </form>
  )
}
