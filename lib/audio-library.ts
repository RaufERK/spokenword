import { unlink } from 'fs/promises'
import path from 'path'

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
  const base = audioLibraryDir()
  const resolved = path.resolve(base, systemName)
  if (!resolved.startsWith(path.resolve(base) + path.sep) && resolved !== path.resolve(base)) {
    return null
  }
  return resolved
}

export async function removeAudioLibraryFile(systemName: string) {
  const filePath = audioLibraryFilePath(systemName)
  if (!filePath) return
  await unlink(filePath).catch(() => undefined)
}
