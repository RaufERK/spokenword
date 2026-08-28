import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'
import path from 'path'

export function sha256File(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk: Buffer | string) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

export function decodeUploadName(value: string) {
  if (!value || /[\u0400-\u04FF]/.test(value)) return value
  try {
    const decoded = Buffer.from(value, 'latin1').toString('utf8')
    if (/[\u0400-\u04FF]/.test(decoded) && !decoded.includes('\uFFFD')) return decoded
  } catch {
    // keep original
  }
  return value
}

export function audioLibraryDir() {
  return process.env.NODE_ENV === 'production'
    ? '/home/appuser/apps/spokenword/shared/public/audio-library'
    : path.join(process.cwd(), 'public/audio-library')
}

export function audioLibraryFilePath(systemName: string) {
  if (!systemName || systemName !== path.basename(systemName) || systemName.includes('..')) {
    return null
  }
  const base = audioLibraryDir()
  const resolved = path.resolve(base, systemName)
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    return null
  }
  return resolved
}

export function playableSystemNameFromOriginal(systemName: string) {
  const base = path.basename(systemName)
  if (!base || base !== systemName || base.includes('..')) return null
  const stem = base.replace(/\.[^.]+$/i, '')
  if (!stem) return null
  return `${stem}_64k.mp3`
}

export async function removeAudioLibraryFile(systemName: string) {
  const filePath = audioLibraryFilePath(systemName)
  if (!filePath) return
  await unlink(filePath).catch(() => undefined)
}

export async function removeAudioLibraryFiles(...systemNames: Array<string | null | undefined>) {
  const unique = [...new Set(systemNames.filter((name): name is string => Boolean(name)))]
  for (const name of unique) {
    await removeAudioLibraryFile(name)
  }
}
