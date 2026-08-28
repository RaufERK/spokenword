import { existsSync } from 'fs'
import { stat } from 'fs/promises'
import prisma from '../lib/prisma.js'
import {
  audioLibraryFilePath,
  playableSystemNameFromOriginal,
} from '../lib/audio-library.js'
import { makeSpeechPlayable } from '../lib/audio-playable.js'

async function main() {
  const lectures = await prisma.audioLecture.findMany({
    select: {
      id: true,
      title: true,
      systemName: true,
      playableSystemName: true,
      playableSize: true,
      size: true,
    },
    orderBy: { uploadedAt: 'asc' },
  })

  let filled = 0
  let skipped = 0

  for (const lecture of lectures) {
    const originalPath = audioLibraryFilePath(lecture.systemName)
    if (!originalPath || !existsSync(originalPath)) {
      console.warn(`Audio lecture playable: missing original for #${lecture.id} ${lecture.systemName}`)
      skipped += 1
      continue
    }

    if (lecture.playableSystemName) {
      const existingPlayable = audioLibraryFilePath(lecture.playableSystemName)
      if (existingPlayable && existsSync(existingPlayable)) {
        skipped += 1
        continue
      }
    }

    const originalSize = Number(lecture.size) || (await stat(originalPath)).size
    const candidateName = playableSystemNameFromOriginal(lecture.systemName)
    const candidatePath = candidateName ? audioLibraryFilePath(candidateName) : null

    if (candidatePath && existsSync(candidatePath)) {
      const playableSize = (await stat(candidatePath)).size
      if (playableSize > 0 && playableSize < originalSize) {
        await prisma.audioLecture.update({
          where: { id: lecture.id },
          data: { playableSystemName: candidateName, playableSize },
        })
        filled += 1
        console.log(`Audio lecture playable: reused ${candidateName} for #${lecture.id} «${lecture.title}»`)
        continue
      }
    }

    try {
      const playable = await makeSpeechPlayable({
        originalPath,
        originalSystemName: lecture.systemName,
        originalSize,
      })
      await prisma.audioLecture.update({
        where: { id: lecture.id },
        data: {
          playableSystemName: playable.playableSystemName,
          playableSize: playable.playableSize,
        },
      })
      filled += 1
      console.log(
        `Audio lecture playable: #${lecture.id} «${lecture.title}» → ${playable.playableSystemName} (${playable.playableSize} bytes)`
      )
    } catch (error) {
      console.error(`Audio lecture playable: failed #${lecture.id} «${lecture.title}»`, error)
      skipped += 1
    }
  }

  console.log(`Audio lecture playable: filled ${filled}, skipped ${skipped}`)
}

main()
  .catch((error) => {
    console.error('Audio lecture playable: failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
