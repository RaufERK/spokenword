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
        <p>
          Ваш логин: <b>{result.login}</b>
        </p>
        <p>
          Пароль: <b>{result.password}</b>
        </p>
        <p className='mt-4 text-sm text-gray-600'>
          Сохраните данные. Пароль можно будет напомнить у администратора.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='max-w-md mx-auto p-6 space-y-4'>
      <input name='firstName' placeholder='Имя' className='input' required />
      <input name='lastName' placeholder='Фамилия' className='input' required />
      <input name='phone' placeholder='Телефон' className='input' required />
      <input name='email' placeholder='E-mail' className='input' />
      <input name='city' placeholder='Город' className='input' />
      <button className='btn w-full'>Зарегистрироваться</button>
    </form>
  )
}
