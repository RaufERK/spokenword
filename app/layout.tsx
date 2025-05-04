// ---------- app/layout.tsx ----------
import './globals.css'
import { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth‑context'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='ru'>
      <body className='min-h-screen bg-gray-50 text-gray-900'>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
