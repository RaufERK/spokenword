'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function StreamTokenAuth() {
  const params = useSearchParams()
  const router = useRouter()
  const { status, update } = useSession()
  const token = params?.get('token') ?? null
  const [authStarted, setAuthStarted] = useState(false)

  useEffect(() => {
    if (!token || authStarted || status === 'loading') return

    let cancelled = false
    const tokenParam = token
    setAuthStarted(true)

    async function authorizeByToken() {
      try {
        const result = await signIn('credentials', {
          magicToken: tokenParam,
          redirect: false,
        })

        if (!cancelled && !result?.error) {
          await update()
        }
      } catch {
        // Fall through to strip the token from the URL.
      }

      if (!cancelled) {
        router.replace('/')
      }
    }

    authorizeByToken()

    return () => {
      cancelled = true
    }
  }, [token, authStarted, status, update, router])

  return null
}
