// ---------- app/admin/page.tsx (управление трансляцией) ----------
import StreamControls from '@/components/StreamControls'

export default function AdminStreamPage() {
  return (
    <>
      <h1 className='text-2xl font-semibold mb-6'>Управление трансляцией</h1>
      <StreamControls />
    </>
  )
}
