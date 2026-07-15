import Providers from '@/components/Providers'
import SideNav from '@/components/navigation/SideNav'
import '@/styles/globals.css'
import Script from 'next/script'

export const metadata = { title: 'Spoken-Word' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='ru'>
      <body className='min-h-screen'>
        <Script
          defer
          src='https://analytics.amasters.ru/script.js'
          data-website-id='c6bb3ea0-1c30-4f91-96b7-1b313e61120c'
          strategy='afterInteractive'
        />
        <Providers>
          <SideNav />
          {children}
        </Providers>
      </body>
    </html>
  )
}
