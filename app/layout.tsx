import Providers from '@/components/Providers'
import SideNav from '@/components/navigation/SideNav'
import '@/styles/globals.css'

export const metadata = { title: 'Spoken-Word' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='ru'>
      <body className='min-h-screen'>
        <Providers>
          <SideNav />
          {children}
        </Providers>
      </body>
    </html>
  )
}
