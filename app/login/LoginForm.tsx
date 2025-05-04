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
    const res = await fetch('/api/login', {
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
      className='max-w-sm mx-auto mt-20 p-6 bg-white rounded shadow'
    >
      <h1 className='text-xl font-semibold mb-4'>Вход в админку</h1>
      {error && <p className='text-red-600 mb-2'>{error}</p>}
      <input
        type='text'
        className='w-full border rounded p-2 mb-3'
        placeholder='Логин'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type='password'
        className='w-full border rounded p-2 mb-4'
        placeholder='Пароль'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        type='submit'
        className='w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700'
      >
        Войти
      </button>
    </form>
  )
}
