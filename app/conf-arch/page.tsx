import ArchiveConfList from '@/components/ArchiveConfList'

export default function ConfArchPage() {
  return (
    <main className='p-4 max-w-4xl mx-auto'>
      <h1 className='text-2xl font-semibold mb-4'>Архив конференций</h1>
      <ArchiveConfList canDelete={false} />
    </main>
  )
}
