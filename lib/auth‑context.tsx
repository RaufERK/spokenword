// ---------- lib/auth-context.tsx ---------------------------
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'

interface AuthCtx {
  user: string | null
}
const AuthContext = createContext<AuthCtx>({ user: null })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(null)
  // const router = useRouter()
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
  }, [])
  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  )
}
