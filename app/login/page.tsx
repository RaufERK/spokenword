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
    <form onSubmit={handleSubmit} className='max-w-sm mx-auto p-6 space-y-4'>
      <input name='login' placeholder='Логин' className='input' required />
      <input
        name='password'
        placeholder='Пароль'
        className='input'
        type='password'
        required
      />
      {error && <p className='text-red-600'>{error}</p>}
      <button className='btn w-full'>Войти</button>
    </form>
  )
}
