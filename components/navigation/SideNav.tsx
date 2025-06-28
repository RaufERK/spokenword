import SideNavDesktop from './SideNavDesktop'
import SideNavMobile from './SideNavMobile'

export default function SideNav() {
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
