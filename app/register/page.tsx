// app/register/page.tsx
'use client'

import { useState } from 'react'

export default function RegisterPage() {
  const [result, setResult] = useState<{
    login: string
    password: string
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const body = Object.fromEntries(new FormData(form).entries())
    const r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.ok) setResult(await r.json())
  }

  if (result) {
    return (
      <div className='max-w-md mx-auto p-6 bg-green-100 rounded-xl mt-10'>
        <h2 className='text-xl font-bold mb-4'>Успех!</h2>
        <p className='w-full border border-stone-200 rounded p-2 mb-3 text-black placeholder-gray-500'>
          Ваш логин: <b>{result.login}</b>
        </p>
        <p className='w-full border border-stone-200 rounded p-2 mb-3 text-black placeholder-gray-500'>
          Пароль: <b>{result.password}</b>
        </p>
        <p className='mt-4 text-sm text-gray-600'>
          Сохраните данные. Пароль можно будет напомнить у администратора.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-sm mx-auto mt-20 p-6 bg-white border border-blue-500 text-gray-900 rounded shadow-lg'
    >
      <input
        name='firstName'
        placeholder='Имя'
        required
        className='w-full border border-blue-400 rounded p-2 mb-4 text-black placeholder-gray-500'
      />
      <input
        name='lastName'
        placeholder='Фамилия'
        required
        className='w-full border border-blue-400 rounded p-2 mb-4 text-black placeholder-gray-500'
      />
      <input
        name='phone'
        placeholder='Телефон'
        required
        className='w-full border border-blue-400 rounded p-2 mb-4 text-black placeholder-gray-500'
      />
      <input
        name='email'
        placeholder='E-mail'
        className='w-full border border-blue-400 rounded p-2 mb-4 text-black placeholder-gray-500'
      />
      <input
        name='city'
        placeholder='Город'
        className='w-full border border-blue-400 rounded p-2 mb-4 text-black placeholder-gray-500'
      />
      <button className='w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 font-semibold'>
        Зарегистрироваться
      </button>
    </form>
  )
}
