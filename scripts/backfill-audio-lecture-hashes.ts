import { existsSync } from 'fs'
import prisma from '../lib/prisma.js'
import { audioLibraryFilePath, sha256File } from '../lib/audio-library.js'

async function main() {
  const lectures = await prisma.audioLecture.findMany({
    where: { contentHash: null },
    select: { id: true, title: true, systemName: true },
    orderBy: { uploadedAt: 'asc' },
  })

  if (lectures.length === 0) {
    console.log('Audio lecture hashes: nothing to backfill')
    return
  }

  let hashed = 0
  let skipped = 0

  for (const lecture of lectures) {
    const filePath = audioLibraryFilePath(lecture.systemName)
    if (!filePath || !existsSync(filePath)) {
      console.warn(`Audio lecture hashes: missing file for #${lecture.id} ${lecture.systemName}`)
      skipped += 1
      continue
    }

    const contentHash = await sha256File(filePath)
    const taken = await prisma.audioLecture.findUnique({
      where: { contentHash },
      select: { id: true, title: true },
    })
    if (taken) {
      console.warn(
        `Audio lecture hashes: #${lecture.id} «${lecture.title}» is a duplicate of #${taken.id} «${taken.title}»`
      )
      skipped += 1
      continue
    }

    await prisma.audioLecture.update({
      where: { id: lecture.id },
      data: { contentHash },
    })
    hashed += 1
  }

  console.log(`Audio lecture hashes: filled ${hashed}, skipped ${skipped}`)
}

main()
  .catch((error) => {
    console.error('Audio lecture hashes: failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
