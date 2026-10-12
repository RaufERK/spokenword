import { access, copyFile, mkdir, rename, unlink } from 'fs/promises'
import path from 'path'

export type ArchiveKind = 'conf' | 'class'

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

export function archivePublicDir(kind: ArchiveKind): string {
  if (isProduction()) {
    return kind === 'conf'
      ? '/home/appuser/apps/spokenword/shared/public/conf-archive'
      : '/home/appuser/apps/spokenword/shared/public/class-archive'
  }
  return path.resolve(
    process.cwd(),
    kind === 'conf' ? 'public/conf-archive' : 'public/class-archive',
  )
}

export function archivePrivateDir(kind: ArchiveKind): string {
  if (isProduction()) {
    return kind === 'conf'
      ? '/home/appuser/apps/spokenword/shared/private/conf-archive'
      : '/home/appuser/apps/spokenword/shared/private/class-archive'
  }
  return path.resolve(
    process.cwd(),
    kind === 'conf' ? 'private/conf-archive' : 'private/class-archive',
  )
}

export function archiveFilePath(kind: ArchiveKind, systemName: string, hidden: boolean): string {
  return path.join(hidden ? archivePrivateDir(kind) : archivePublicDir(kind), systemName)
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function moveFile(from: string, to: string) {
  await mkdir(path.dirname(to), { recursive: true })
  try {
    await rename(from, to)
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined
    if (code !== 'EXDEV') throw error
    await copyFile(from, to)
    await unlink(from)
  }
}

export class ArchiveFileMissingError extends Error {
  constructor(systemName: string) {
    super(`Archive file is missing on disk: ${systemName}`)
    this.name = 'ArchiveFileMissingError'
  }
}

/** Move a public recording out of the nginx/static directory. */
export async function hideArchiveFile(kind: ArchiveKind, systemName: string) {
  const from = archiveFilePath(kind, systemName, false)
  const to = archiveFilePath(kind, systemName, true)
  if (!(await exists(from))) {
    if (await exists(to)) return
    throw new ArchiveFileMissingError(systemName)
  }
  await moveFile(from, to)
}

/** Move a hidden recording back to the public directory. */
export async function restoreArchiveFile(kind: ArchiveKind, systemName: string) {
  const from = archiveFilePath(kind, systemName, true)
  const to = archiveFilePath(kind, systemName, false)
  if (!(await exists(from))) {
    if (await exists(to)) return
    throw new ArchiveFileMissingError(systemName)
  }
  await moveFile(from, to)
}

export async function purgeArchiveFile(kind: ArchiveKind, systemName: string) {
  await unlink(archiveFilePath(kind, systemName, false)).catch(() => {})
  await unlink(archiveFilePath(kind, systemName, true)).catch(() => {})
}

export function contentDispositionAttachment(filename: string): string {
  const cleaned = filename.replace(/[\r\n"]/g, '_').trim() || 'video.mp4'
  const withExt = /\.[a-z0-9]{2,5}$/i.test(cleaned) ? cleaned : `${cleaned}.mp4`
  const ascii = withExt.replace(/[^\x20-\x7E]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(withExt)}`
}
