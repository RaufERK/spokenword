// app/login2/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/login2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push(next)
    } else {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-sm mx-auto mt-20 p-6 bg-white border border-blue-500 text-gray-900 rounded shadow-lg'
    >
      <h1 className='text-2xl font-bold mb-4 text-center text-blue-800'>
        Вход в админку
      </h1>
      {error && (
        <p className='text-red-600 mb-2 text-center font-medium'>{error}</p>
      )}
      <input
        type='text'
        className='w-full border border-blue-400 rounded p-2 mb-3 text-black placeholder-gray-500'
        placeholder='Логин'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type='password'
        className='w-full border border-blue-400 rounded p-2 mb-4 text-black placeholder-gray-500'
        placeholder='Пароль'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type='submit'
        className='w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 font-semibold'
      >
        Войти
      </button>
    </form>
  )
}
