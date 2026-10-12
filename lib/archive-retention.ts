import {
  ArchiveFileMissingError,
  hideArchiveFile,
  purgeArchiveFile,
  restoreArchiveFile,
  type ArchiveKind,
} from '@/lib/archive-files'
import prisma from '@/lib/prisma'

type RetentionResult = {
  status: 200 | 404 | 409
  body: { ok: true; hidden?: boolean; purged?: boolean } | { error: string }
}

async function findArchive(kind: ArchiveKind, systemName: string) {
  switch (kind) {
    case 'conf':
      return prisma.conferenceFile.findUnique({
        where: { systemName },
        select: { id: true, deletedAt: true },
      })
    case 'class':
      return prisma.classFile.findUnique({
        where: { systemName },
        select: { id: true, deletedAt: true },
      })
    default: {
      const unreachable: never = kind
      return unreachable
    }
  }
}

async function setDeletedAt(kind: ArchiveKind, id: number, deletedAt: Date | null) {
  switch (kind) {
    case 'conf':
      await prisma.conferenceFile.update({ where: { id }, data: { deletedAt } })
      return
    case 'class':
      await prisma.classFile.update({ where: { id }, data: { deletedAt } })
      return
    default: {
      const unreachable: never = kind
      return unreachable
    }
  }
}

async function deleteArchiveRow(kind: ArchiveKind, id: number) {
  switch (kind) {
    case 'conf':
      await prisma.conferenceFile.delete({ where: { id } })
      return
    case 'class':
      await prisma.classFile.delete({ where: { id } })
      return
    default: {
      const unreachable: never = kind
      return unreachable
    }
  }
}

export async function softHideArchiveFile(
  kind: ArchiveKind,
  systemName: string,
): Promise<RetentionResult> {
  const file = await findArchive(kind, systemName)
  if (!file) return { status: 404, body: { error: 'Файл не найден' } }
  if (file.deletedAt) return { status: 200, body: { ok: true, hidden: true } }

  try {
    await hideArchiveFile(kind, systemName)
  } catch (error) {
    if (error instanceof ArchiveFileMissingError) {
      return { status: 409, body: { error: 'Файл не найден на диске' } }
    }
    console.error('Failed to hide archive file', kind, systemName, error)
    return { status: 409, body: { error: 'Не удалось скрыть файл' } }
  }

  try {
    await setDeletedAt(kind, file.id, new Date())
  } catch (error) {
    await restoreArchiveFile(kind, systemName).catch(() => {})
    console.error('Failed to mark archive file hidden', kind, systemName, error)
    return { status: 409, body: { error: 'Не удалось скрыть файл' } }
  }

  return { status: 200, body: { ok: true, hidden: true } }
}

export async function restoreHiddenArchiveFile(
  kind: ArchiveKind,
  systemName: string,
): Promise<RetentionResult> {
  const file = await findArchive(kind, systemName)
  if (!file?.deletedAt) return { status: 404, body: { error: 'Файл не найден' } }

  try {
    await restoreArchiveFile(kind, systemName)
  } catch (error) {
    if (error instanceof ArchiveFileMissingError) {
      return { status: 409, body: { error: 'Файл не найден на диске' } }
    }
    console.error('Failed to restore archive file', kind, systemName, error)
    return { status: 409, body: { error: 'Не удалось вернуть файл' } }
  }

  try {
    await setDeletedAt(kind, file.id, null)
  } catch (error) {
    await hideArchiveFile(kind, systemName).catch(() => {})
    console.error('Failed to mark archive file restored', kind, systemName, error)
    return { status: 409, body: { error: 'Не удалось вернуть файл' } }
  }

  return { status: 200, body: { ok: true, hidden: false } }
}

export async function purgeArchiveRecord(
  kind: ArchiveKind,
  systemName: string,
): Promise<RetentionResult> {
  const file = await findArchive(kind, systemName)
  if (!file) return { status: 404, body: { error: 'Файл не найден' } }

  await deleteArchiveRow(kind, file.id)
  await purgeArchiveFile(kind, systemName)

  return { status: 200, body: { ok: true, purged: true } }
}
