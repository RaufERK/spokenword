import ConferencePlayer from '@/components/ConferencePlayer'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'

type Params = { systemName: string }

export default async function WatchClassFilePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { systemName } = await params
  const file = await prisma.classFile.findUnique({ where: { systemName } })
  if (!file) return notFound()

  return (
    <main className='max-w-2xl mx-auto p-4'>
      <h1 className='text-2xl mb-4'>{file.displayName}</h1>
      <ConferencePlayer
        src={`/api/class/${encodeURIComponent(file.systemName)}`}
        systemName={file.systemName}
      />
    </main>
  )
}
