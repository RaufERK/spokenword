import prisma from '@/lib/prisma'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type MirrorAction = 'create' | 'update' | 'delete'
type MirrorMediaType = 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker'

type MirrorMediaFile = {
  mediaType: MirrorMediaType
}

type TelegramEntityPayload = {
  type: string
  offset: number
  length: number
  url?: string
  language?: string
  customEmojiId?: string
}

type MirrorPayload = {
  action: MirrorAction
  telegramMessageId: number
  channelId: string
  channelUsername?: string
  telegramDate: number
  text?: string
  caption?: string
  entities?: TelegramEntityPayload[]
  captionEntities?: TelegramEntityPayload[]
  mediaType?: MirrorMediaType
  mediaFiles: MirrorMediaFile[]
}

const MIRROR_ACTIONS: MirrorAction[] = ['create', 'update', 'delete']
const MIRROR_MEDIA_TYPES: MirrorMediaType[] = [
  'photo',
  'video',
  'document',
  'audio',
  'voice',
  'sticker',
]

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const NEWS_MEDIA_DIR = path.resolve(process.cwd(), 'public/news-media')

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = getRateLimitMaxRequests()
const requestTimestampsByIp = new Map<string, number[]>()

function getRateLimitMaxRequests(): number {
  const fromEnv = Number(process.env.MIRROR_RATE_LIMIT_MAX ?? 60)
  if (!Number.isFinite(fromEnv) || fromEnv <= 0) {
    return 60
  }
  return Math.floor(fromEnv)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMirrorAction(value: unknown): value is MirrorAction {
  return typeof value === 'string' && MIRROR_ACTIONS.includes(value as MirrorAction)
}

function isMirrorMediaType(value: unknown): value is MirrorMediaType {
  return typeof value === 'string' && MIRROR_MEDIA_TYPES.includes(value as MirrorMediaType)
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function toRequiredChannelId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return null
}

function toRequiredInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : null
  }
  return null
}

function normalizeEntities(value: unknown): TelegramEntityPayload[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const normalized = value
    .map((entry): TelegramEntityPayload | null => {
      if (!isRecord(entry)) {
        return null
      }

      const type = toOptionalString(entry.type)
      const offset = toRequiredInteger(entry.offset)
      const length = toRequiredInteger(entry.length)

      if (!type || offset === null || length === null || offset < 0 || length <= 0) {
        return null
      }

      return {
        type,
        offset,
        length,
        url: toOptionalString(entry.url),
        language: toOptionalString(entry.language),
        customEmojiId: toOptionalString(entry.customEmojiId) ?? toOptionalString(entry.custom_emoji_id),
      }
    })
    .filter((entry): entry is TelegramEntityPayload => entry !== null)

  return normalized.length > 0 ? normalized : undefined
}

function normalizePayload(input: unknown): { payload: MirrorPayload | null; error?: string } {
  if (!isRecord(input)) {
    return { payload: null, error: 'Payload must be an object' }
  }

  if (!isMirrorAction(input.action)) {
    return { payload: null, error: 'Invalid action' }
  }

  const telegramMessageId = toRequiredInteger(input.telegramMessageId)
  if (telegramMessageId === null) {
    return { payload: null, error: 'Invalid telegramMessageId' }
  }

  const channelId = toRequiredChannelId(input.channelId)
  if (!channelId) {
    return { payload: null, error: 'Invalid channelId' }
  }

  const telegramDate = toRequiredInteger(input.telegramDate)
  if (telegramDate === null) {
    return { payload: null, error: 'Invalid telegramDate' }
  }

  if (!Array.isArray(input.mediaFiles)) {
    return { payload: null, error: 'mediaFiles must be an array' }
  }

  const mediaFiles: MirrorMediaFile[] = input.mediaFiles
    .map((entry): MirrorMediaFile | null => {
      if (!isRecord(entry) || !isMirrorMediaType(entry.mediaType)) {
        return null
      }
      return { mediaType: entry.mediaType }
    })
    .filter((entry): entry is MirrorMediaFile => entry !== null)

  const mediaType = isMirrorMediaType(input.mediaType) ? input.mediaType : undefined

  return {
    payload: {
      action: input.action,
      telegramMessageId,
      channelId,
      channelUsername: toOptionalString(input.channelUsername),
      telegramDate,
      text: toOptionalString(input.text),
      caption: toOptionalString(input.caption),
      entities: normalizeEntities(input.entities),
      captionEntities: normalizeEntities(input.captionEntities),
      mediaType,
      mediaFiles,
    },
  }
}

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  const [scheme, ...tokenParts] = authHeader.split(' ')
  if (scheme !== 'Bearer') {
    return null
  }

  const token = tokenParts.join(' ').trim()
  return token.length > 0 ? token : null
}

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  return realIp && realIp.length > 0 ? realIp : 'unknown'
}

function isRateLimitExceeded(request: NextRequest): boolean {
  const now = Date.now()
  const threshold = now - RATE_LIMIT_WINDOW_MS
  const ip = getRequestIp(request)
  const existing = requestTimestampsByIp.get(ip) ?? []
  const fresh = existing.filter((timestamp) => timestamp > threshold)

  if (fresh.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimestampsByIp.set(ip, fresh)
    return true
  }

  fresh.push(now)
  requestTimestampsByIp.set(ip, fresh)
  return false
}

async function parseRequestBody(
  request: NextRequest
): Promise<{ payload: MirrorPayload | null; files: File[]; error?: string; status?: number }> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

  if (contentType.startsWith('application/json')) {
    try {
      const rawPayload = (await request.json()) as unknown
      const { payload, error } = normalizePayload(rawPayload)
      if (!payload) {
        return { payload: null, files: [], error: error ?? 'Invalid payload', status: 422 }
      }
      return { payload, files: [] }
    } catch {
      return { payload: null, files: [], error: 'Invalid JSON body', status: 400 }
    }
  }

  if (contentType.startsWith('multipart/form-data')) {
    try {
      const formData = await request.formData()
      const rawPayload = formData.get('payload')

      if (typeof rawPayload !== 'string') {
        return { payload: null, files: [], error: 'Missing payload field in multipart body', status: 422 }
      }

      const parsedPayload = JSON.parse(rawPayload) as unknown
      const { payload, error } = normalizePayload(parsedPayload)
      if (!payload) {
        return { payload: null, files: [], error: error ?? 'Invalid payload', status: 422 }
      }

      const files = formData
        .getAll('files')
        .filter((entry): entry is File => entry instanceof File)

      return { payload, files }
    } catch {
      return { payload: null, files: [], error: 'Invalid multipart payload', status: 400 }
    }
  }

  return { payload: null, files: [], error: 'Unsupported content-type', status: 415 }
}

function getImageExtension(file: File): string {
  const nameExtension = path.extname(file.name ?? '').toLowerCase()
  if (nameExtension === '.jpg' || nameExtension === '.jpeg' || nameExtension === '.png' || nameExtension === '.webp' || nameExtension === '.gif') {
    return nameExtension
  }
  return MIME_TO_EXTENSION[file.type] ?? '.jpg'
}

async function saveFirstValidImage(files: File[]): Promise<string | null> {
  for (const file of files) {
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE_BYTES) {
      continue
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      continue
    }

    const fileName = `${Date.now()}-${randomUUID()}${getImageExtension(file)}`
    const filePath = path.join(NEWS_MEDIA_DIR, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    await mkdir(NEWS_MEDIA_DIR, { recursive: true })
    await writeFile(filePath, fileBuffer)
    return `/news-media/${fileName}`
  }

  return null
}

async function deleteLocalImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('/news-media/')) {
    return
  }

  const fileName = imageUrl.replace('/news-media/', '')
  if (!fileName) {
    return
  }

  const filePath = path.join(NEWS_MEDIA_DIR, fileName)
  try {
    await unlink(filePath)
  } catch {
    // ignore remove errors for already deleted files
  }
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MIRROR_API_SECRET?.trim()
  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: 'MIRROR_API_SECRET is not configured' }, { status: 500 })
  }

  const token = parseBearerToken(request.headers.get('authorization'))
  if (!token || token !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (isRateLimitExceeded(request)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  const parsedRequest = await parseRequestBody(request)
  if (!parsedRequest.payload) {
    return NextResponse.json(
      { ok: false, error: parsedRequest.error ?? 'Invalid payload' },
      { status: parsedRequest.status ?? 400 }
    )
  }

  const payload = parsedRequest.payload
  const telegramDate = new Date(payload.telegramDate * 1000)
  if (Number.isNaN(telegramDate.getTime())) {
    return NextResponse.json({ ok: false, error: 'Invalid telegramDate' }, { status: 422 })
  }

  const postWhere = {
    channelId_telegramMessageId: {
      channelId: payload.channelId,
      telegramMessageId: payload.telegramMessageId,
    },
  }

  try {
    switch (payload.action) {
      case 'delete': {
        await prisma.channelPost.upsert({
          where: postWhere,
          create: {
            telegramMessageId: payload.telegramMessageId,
            channelId: payload.channelId,
            channelUsername: payload.channelUsername ?? null,
            telegramDate,
            text: null,
            mediaType: null,
            imageUrl: null,
            isDeleted: true,
          },
          update: {
            channelUsername: payload.channelUsername ?? undefined,
            telegramDate,
            isDeleted: true,
          },
        })

        return NextResponse.json({ ok: true })
      }

      case 'create':
      case 'update': {
        const existingPost = await prisma.channelPost.findUnique({
          where: postWhere,
          select: { imageUrl: true },
        })

        const hasPhotoMedia =
          payload.mediaType === 'photo' ||
          payload.mediaFiles.some((mediaFile) => mediaFile.mediaType === 'photo')

        const savedImageUrl = hasPhotoMedia ? await saveFirstValidImage(parsedRequest.files) : null
        const currentText = payload.text ?? payload.caption ?? null
        const currentEntities = payload.text ? payload.entities : payload.captionEntities
        const normalizedText = currentText && currentText.trim().length > 0 ? currentText : null
        const nextImageUrl = savedImageUrl ?? existingPost?.imageUrl ?? null
        const nextMediaType = nextImageUrl ? 'photo' : null

        const hasRenderableContent = Boolean(normalizedText || nextImageUrl)
        if (!hasRenderableContent && !existingPost) {
          if (savedImageUrl) {
            await deleteLocalImage(savedImageUrl)
          }
          return NextResponse.json({ ok: true })
        }

        await prisma.channelPost.upsert({
          where: postWhere,
          create: {
            telegramMessageId: payload.telegramMessageId,
            channelId: payload.channelId,
            channelUsername: payload.channelUsername ?? null,
            telegramDate,
            text: normalizedText,
            textEntities: normalizedText ? (currentEntities ?? null) : null,
            mediaType: nextMediaType,
            imageUrl: nextImageUrl,
            isDeleted: false,
          },
          update: {
            channelUsername: payload.channelUsername ?? undefined,
            telegramDate,
            text: normalizedText,
            textEntities: normalizedText ? (currentEntities ?? null) : null,
            mediaType: nextMediaType,
            imageUrl: nextImageUrl,
            isDeleted: false,
          },
        })

        if (savedImageUrl && existingPost?.imageUrl && existingPost.imageUrl !== savedImageUrl) {
          await deleteLocalImage(existingPost.imageUrl)
        }

        return NextResponse.json({ ok: true })
      }

      default: {
        const neverAction: never = payload.action
        return NextResponse.json({ ok: false, error: `Unsupported action: ${neverAction}` }, { status: 422 })
      }
    }
  } catch (error) {
    console.error('Mirror sync error:', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
