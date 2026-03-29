'use client'

import { usePathname } from 'next/navigation'
import SideNavDesktop from './SideNavDesktop'
import SideNavMobile from './SideNavMobile'

export default function SideNav() {
  const pathname = usePathname()

  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <>
      {/* Desktop version */}
      <div className='hidden md:flex'>
        <SideNavDesktop />
      </div>
      {/* Mobile version */}
      <div className='flex md:hidden'>
        <SideNavMobile />
      </div>
    </>
  )
}
