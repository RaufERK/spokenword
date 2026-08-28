import '../utils/load-env.js'
import { spawn, type ChildProcess } from 'child_process'
import { access, readFile } from 'fs/promises'
import path from 'path'
import prisma from '../../lib/prisma.js'

const POLL_MS = 20_000
const ICECAST_STATUS_URL = process.env.ICECAST_STATUS_URL || 'http://127.0.0.1:8000/status-json.xsl'
const ICECAST_HOST = process.env.ICECAST_HOST || '127.0.0.1'
const ICECAST_PORT = process.env.ICECAST_PORT || '8000'
const PASSWORD_FILE = process.env.ICECAST_SOURCE_PASSWORD_FILE || '/etc/audio-word/icecast-source-password'
const LIBRARY_DIR =
  process.env.NODE_ENV === 'production'
    ? '/home/appuser/apps/spokenword/shared/public/audio-library'
    : path.resolve(process.cwd(), '../public/audio-library')

let ffmpegProcess: ChildProcess | null = null
let playingSlotId: number | null = null

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readSourcePassword() {
  if (process.env.ICECAST_SOURCE_PASSWORD) {
    return process.env.ICECAST_SOURCE_PASSWORD
  }
  try {
    return (await readFile(PASSWORD_FILE, 'utf8')).trim()
  } catch {
    return null
  }
}

function sourceMatchesMain(source: { listenurl?: string; mount?: string } | null) {
  if (!source) return false
  const listenurl = source.listenurl || ''
  const mount = source.mount || ''
  return listenurl.includes('/main') || mount === '/main' || mount.endsWith('/main')
}

async function isMainMountLive() {
  try {
    const response = await fetch(ICECAST_STATUS_URL, { cache: 'no-store' })
    if (!response.ok) return false
    const data = await response.json()
    const source = data?.icestats?.source
    if (!source) return false
    if (Array.isArray(source)) {
      return source.some((item) => sourceMatchesMain(item))
    }
    return sourceMatchesMain(source)
  } catch {
    return false
  }
}

async function markSlot(
  id: number,
  status: 'PLAYING' | 'DONE' | 'SKIPPED_LIVE' | 'FAILED',
  errorLog?: string | null
) {
  await prisma.audioBroadcastSlot.update({
    where: { id },
    data: { status, errorLog: errorLog ?? null },
  })
}

function startFfmpeg(filePath: string, password: string, slotId: number) {
  const icecastUrl = `icecast://source:${encodeURIComponent(password)}@${ICECAST_HOST}:${ICECAST_PORT}/main`
  const isMp3 = path.extname(filePath).toLowerCase() === '.mp3'
  const audioArgs = isMp3
    ? ['-c:a', 'copy']
    : ['-vn', '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '22050', '-ac', '1']
  const child = spawn(
    'ffmpeg',
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'warning',
      '-re',
      '-i',
      filePath,
      ...audioArgs,
      '-content_type',
      'audio/mpeg',
      '-f',
      'mp3',
      icecastUrl,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let stderr = ''
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString()
    if (stderr.length > 2000) stderr = stderr.slice(-2000)
  })

  child.on('exit', async (code) => {
    ffmpegProcess = null
    playingSlotId = null
    const status = code === 0 ? 'DONE' : 'FAILED'
    await markSlot(slotId, status, code === 0 ? null : stderr.trim() || `ffmpeg exited ${code}`)
    console.log(`Audio broadcast slot #${slotId} ${status}`)
  })

  ffmpegProcess = child
  playingSlotId = slotId
}

async function recoverLostPlayingSlots() {
  if (ffmpegProcess) return
  await prisma.audioBroadcastSlot.updateMany({
    where: { status: 'PLAYING' },
    data: { status: 'FAILED', errorLog: 'ffmpeg process lost' },
  })
}

async function tick() {
  await recoverLostPlayingSlots()
  if (ffmpegProcess) return

  const now = new Date()
  const slot = await prisma.audioBroadcastSlot.findFirst({
    where: { status: 'SCHEDULED', startsAt: { lte: now } },
    orderBy: { startsAt: 'asc' },
    include: { lecture: { select: { systemName: true, playableSystemName: true, durationSec: true, title: true } } },
  })
  if (!slot) return

  const durationSec = Math.max(slot.lecture.durationSec ?? 0, 60)
  const windowEnd = slot.startsAt.getTime() + (durationSec + 60) * 1000
  if (now.getTime() > windowEnd) {
    await markSlot(slot.id, 'FAILED', 'missed window')
    return
  }

  if (await isMainMountLive()) {
    await markSlot(slot.id, 'SKIPPED_LIVE', 'Icecast /main already has a source')
    console.log(`Audio broadcast slot #${slot.id} skipped: live source on /main`)
    return
  }

  const password = await readSourcePassword()
  if (!password) {
    await markSlot(slot.id, 'FAILED', 'Icecast source password is missing')
    return
  }

  const diskName = slot.lecture.playableSystemName || slot.lecture.systemName
  if (path.basename(diskName) !== diskName) {
    await markSlot(slot.id, 'FAILED', `Invalid audio filename: ${diskName}`)
    return
  }
  const filePath = path.join(LIBRARY_DIR, diskName)
  try {
    await access(filePath)
  } catch {
    await markSlot(slot.id, 'FAILED', `Audio file not found: ${diskName}`)
    return
  }

  await markSlot(slot.id, 'PLAYING', null)
  console.log(`Starting audio broadcast slot #${slot.id}: ${slot.lecture.title}`)
  startFfmpeg(filePath, password, slot.id)
}

async function main() {
  const password = await readSourcePassword()
  console.log('Audio broadcast watcher started')
  console.log(password ? 'Icecast source password: ok' : 'Icecast source password: MISSING')
  for (;;) {
    try {
      await tick()
    } catch (error) {
      console.error('Audio broadcast watcher tick failed:', error)
    }
    await sleep(POLL_MS)
  }
}

function shutdown() {
  if (ffmpegProcess && playingSlotId != null) {
    ffmpegProcess.kill('SIGTERM')
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

main()
