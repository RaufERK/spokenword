// app/login/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const login = (form.elements.namedItem('login') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value

    const res = await signIn('credentials', {
      login,
      password,
      redirect: false,
    })

    if (res?.error) setError('Неверный логин или пароль')
    else router.push('/cabinet')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-sm mx-auto mt-20 p-6 bg-white border border-blue-500 text-gray-900 rounded shadow-lg'
    >
      <input
        className='w-full border border-blue-400 rounded p-2 mb-3 text-black placeholder-gray-500'
        name='login'
        placeholder='Логин'
        required
      />
      <input
        className='w-full border border-blue-400 rounded p-2 mb-3 text-black placeholder-gray-500'
        name='password'
        placeholder='Пароль'
        type='password'
        required
      />
      {error && <p className='text-red-600'>{error}</p>}
      <button className='w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 font-semibold'>
        Войти
      </button>
    </form>
  )
}
