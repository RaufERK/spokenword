// app/login2/page.tsx

import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className='text-center mt-20'>Загрузка…</div>}>
      <LoginForm />
    </Suspense>
  )
}
