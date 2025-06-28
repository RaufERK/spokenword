// app/layout.tsx

import Providers from '@/components/Providers'
import SideNav from '@/components/SideNav'
import '@/styles/globals.css'

export const metadata = { title: 'Spoken-Word' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='ru'>
      <body className='flex flex-col min-h-screen'>
        <Providers>
          <SideNav />
          <main className='flex-grow p-6'>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
