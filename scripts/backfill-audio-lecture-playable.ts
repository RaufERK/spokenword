import { existsSync } from 'fs'
import { stat } from 'fs/promises'
import prisma from '../lib/prisma.js'
import {
  audioLibraryFilePath,
  playableSystemNameFromOriginal,
} from '../lib/audio-library.js'
import { dropOriginalAfterPlayable, makeSpeechPlayable } from '../lib/audio-playable.js'

function fileExists(name: string | null | undefined) {
  if (!name) return false
  const filePath = audioLibraryFilePath(name)
  return Boolean(filePath && existsSync(filePath))
}

async function collapseToPlayable(lecture: {
  id: number
  title: string
  systemName: string
  playableSystemName: string
  playableSize: bigint | number | null
}) {
  const playablePath = audioLibraryFilePath(lecture.playableSystemName)
  if (!playablePath || !existsSync(playablePath)) {
    throw new Error(`playable missing: ${lecture.playableSystemName}`)
  }
  const playableSize = Number(lecture.playableSize) || (await stat(playablePath)).size
  const alreadyCollapsed = lecture.systemName === lecture.playableSystemName
  if (!alreadyCollapsed) {
    await prisma.audioLecture.update({
      where: { id: lecture.id },
      data: {
        systemName: lecture.playableSystemName,
        fileName: lecture.playableSystemName,
        playableSystemName: lecture.playableSystemName,
        size: playableSize,
        playableSize,
        mimeType: 'audio/mpeg',
      },
    })
  }
  const originalPath = audioLibraryFilePath(lecture.systemName)
  if (originalPath && lecture.systemName !== lecture.playableSystemName) {
    await dropOriginalAfterPlayable({
      originalPath,
      originalSystemName: lecture.systemName,
      playableSystemName: lecture.playableSystemName,
    })
  }
}

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
  let dropped = 0
  let skipped = 0

  for (const lecture of lectures) {
    const originalPath = audioLibraryFilePath(lecture.systemName)
    const originalOnDisk = Boolean(originalPath && existsSync(originalPath))
    const playablePath = lecture.playableSystemName
      ? audioLibraryFilePath(lecture.playableSystemName)
      : null
    const playableOnDisk = Boolean(playablePath && existsSync(playablePath))

    try {
      if (!playableOnDisk) {
        if (!originalOnDisk || !originalPath) {
          console.warn(
            `Audio lecture playable: missing files for #${lecture.id} ${lecture.systemName}`
          )
          skipped += 1
          continue
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
            lecture.playableSystemName = candidateName
            lecture.playableSize = playableSize
            filled += 1
          }
        }
        if (!fileExists(lecture.playableSystemName)) {
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
          lecture.playableSystemName = playable.playableSystemName
          lecture.playableSize = playable.playableSize
          filled += 1
          console.log(
            `Audio lecture playable: #${lecture.id} «${lecture.title}» → ${playable.playableSystemName}`
          )
        }
      }

      if (!lecture.playableSystemName) {
        skipped += 1
        continue
      }

      const needsDrop = lecture.systemName !== lecture.playableSystemName
      await collapseToPlayable({
        id: lecture.id,
        title: lecture.title,
        systemName: lecture.systemName,
        playableSystemName: lecture.playableSystemName,
        playableSize: lecture.playableSize,
      })
      if (needsDrop) {
        dropped += 1
        console.log(
          `Audio lecture playable: dropped original for #${lecture.id} «${lecture.title}»`
        )
      }
    } catch (error) {
      console.error(`Audio lecture playable: failed #${lecture.id} «${lecture.title}»`, error)
      skipped += 1
    }
  }

  console.log(`Audio lecture playable: filled ${filled}, dropped originals ${dropped}, skipped ${skipped}`)
}

main()
  .catch((error) => {
    console.error('Audio lecture playable: failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
