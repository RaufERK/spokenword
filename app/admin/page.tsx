// app/admin/page.tsx

import ArchiveList from '@/components/ArchiveList'

export default function AdminArchivePage() {
  return (
    <>
      <h1 className='text-2xl font-semibold mb-6'>Архив записей</h1>
      <ArchiveList canDelete />
    </>
  )
}
