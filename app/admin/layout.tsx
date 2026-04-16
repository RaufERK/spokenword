import AdminNav from '@/components/navigation/AdminNav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='fixed inset-0 flex flex-col bg-gradient-to-br from-[#6a1b4d] via-[#8b2c5e] to-[#4a0e3a]'>
      <AdminNav />
      <main className='flex-1 overflow-auto p-4 min-h-0'>{children}</main>
    </div>
  )
}
