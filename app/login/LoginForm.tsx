// app/login/LoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  // const [username, setUsername] = useState('')
  // const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
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
      className='max-w-sm mx-auto mt-20 p-6 bg-white border border-gray-300 rounded shadow'
    >
      <h1 className='text-xl font-semibold mb-4'>Вход в админку</h1>
      {error && <p className='text-red-600 mb-2'>{error}</p>}
      <input
        type='text'
        className='w-full border border-gray-400 rounded p-2 mb-3'
      />
      <input
        type='password'
        className='w-full border border-gray-400 rounded p-2 mb-4'
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
