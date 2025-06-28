// app/watch-conf/[systemName]/page.tsx

import ConferencePlayer from '@/components/ConferencePlayer'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'

type Params = { systemName: string }

export default async function WatchConfFilePage({
  params,
}: {
  params: Promise<Params>
}) {
  const { systemName } = await params
  const file = await prisma.conferenceFile.findUnique({
    where: { systemName },
  })
  if (!file) return notFound()

  return (
    <main className='max-w-2xl mx-auto p-4'>
      <h1 className='text-2xl mb-4'>{file.displayName}</h1>
      <ConferencePlayer
        src={`/conf-archive/${encodeURIComponent(file.systemName)}`}
      />
    </main>
  )
}
