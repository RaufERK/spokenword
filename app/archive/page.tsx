import ArchiveList from '@/components/ArchiveList'

export default function ArchivePage() {
  return (
    <main className='p-4 max-w-4xl mx-auto'>
      <h1 className='text-2xl font-semibold mb-4'>Архив трансляций</h1>
      <ArchiveList canDelete={false} />
    </main>
  )
}
