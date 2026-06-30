'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

type TokenUser = {
  id: number | string
  login?: string | null
  password?: string | null
  error?: string
}

export default function StreamTokenAuth() {
  const params = useSearchParams()
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const token = params?.get('token') ?? null
  const [authStarted, setAuthStarted] = useState(false)

  useEffect(() => {
    if (!token || authStarted || status === 'loading') return

    let cancelled = false
    const tokenParam = token
    setAuthStarted(true)

    async function authorizeByToken() {
      try {
        const res = await fetch(`/api/profile-from-token?token=${encodeURIComponent(tokenParam)}`)
        const user = (await res.json()) as TokenUser

        if (!res.ok || user.error || !user.login || !user.password) {
          router.replace('/')
          return
        }

        if (session && String(session.user.id) === String(user.id)) {
          router.replace('/')
          return
        }

        const result = await signIn('credentials', {
          login: user.login,
          password: user.password,
          redirect: false,
        })

        if (!cancelled && !result?.error) {
          await update()
        }

        if (!cancelled) {
          router.replace('/')
        }
      } catch {
        if (!cancelled) {
          router.replace('/')
        }
      }
    }

    authorizeByToken()

    return () => {
      cancelled = true
    }
  }, [token, authStarted, status, session, update, router])

  return null
}
