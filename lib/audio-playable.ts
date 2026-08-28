import { spawn } from 'child_process'
import { stat, unlink } from 'fs/promises'
import path from 'path'
import { playableSystemNameFromOriginal } from './audio-library.js'

const TARGET_BITRATE = 64_000
const SKIP_BITRATE = 80_000
const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000
const SMALL_FILE_BYTES = 8 * 1024 * 1024

export type SpeechPlayable = {
  playableSystemName: string
  playableSize: number
}

type AudioProbe = {
  channels: number
  bitRate: number
  durationSec: number
}

function runJsonCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr.trim() || `${command} exited ${code}`))
    })
  })
}

function runFfmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('ffmpeg timed out'))
    }, timeoutMs)

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
      if (stderr.length > 4000) stderr = stderr.slice(-4000)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `ffmpeg exited ${code}`))
    })
  })
}

async function probeAudio(filePath: string): Promise<AudioProbe> {
  const stdout = await runJsonCommand('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'a:0',
    '-show_entries',
    'stream=channels,bit_rate,duration',
    '-show_entries',
    'format=bit_rate,duration',
    '-of',
    'json',
    filePath,
  ])
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{ channels?: number | string; bit_rate?: string; duration?: string }>
    format?: { bit_rate?: string; duration?: string }
  }
  const stream = parsed.streams?.[0]
  const format = parsed.format
  return {
    channels: Number(stream?.channels) || 0,
    bitRate: Number(stream?.bit_rate) || Number(format?.bit_rate) || 0,
    durationSec: Number(format?.duration) || Number(stream?.duration) || 0,
  }
}

export function shouldReuseOriginalAsPlayable(
  probe: AudioProbe,
  originalSize: number
) {
  if (probe.channels === 1 && probe.bitRate > 0 && probe.bitRate <= SKIP_BITRATE) {
    return true
  }
  if (probe.durationSec > 0) {
    const expectedBytes = (TARGET_BITRATE / 8) * probe.durationSec
    if (originalSize <= expectedBytes * 1.1) return true
  }
  if (probe.durationSec <= 0 && originalSize <= SMALL_FILE_BYTES) return true
  return false
}

function playablePathBesideOriginal(originalPath: string, playableSystemName: string) {
  const directory = path.resolve(path.dirname(originalPath))
  const playablePath = path.resolve(directory, playableSystemName)
  if (!playablePath.startsWith(directory + path.sep)) return null
  return playablePath
}

export async function makeSpeechPlayable(options: {
  originalPath: string
  originalSystemName: string
  originalSize: number
}): Promise<SpeechPlayable> {
  const { originalPath, originalSystemName, originalSize } = options
  const playableName = playableSystemNameFromOriginal(originalSystemName)
  if (!playableName) {
    throw new Error('Invalid original filename')
  }

  const reuse = (): SpeechPlayable => ({
    playableSystemName: originalSystemName,
    playableSize: originalSize,
  })

  let probe: AudioProbe
  try {
    probe = await probeAudio(originalPath)
  } catch {
    probe = { channels: 0, bitRate: 0, durationSec: 0 }
  }

  if (shouldReuseOriginalAsPlayable(probe, originalSize)) {
    return reuse()
  }

  const playablePath = playablePathBesideOriginal(originalPath, playableName)
  if (!playablePath) {
    throw new Error('Invalid playable path')
  }

  try {
    await runFfmpeg(
      [
        '-y',
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        originalPath,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '22050',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        playablePath,
      ],
      FFMPEG_TIMEOUT_MS
    )
    const playableSize = (await stat(playablePath)).size
    if (playableSize <= 0) {
      throw new Error('Playable file is empty')
    }
    if (playableSize >= originalSize) {
      await unlink(playablePath).catch(() => undefined)
      return reuse()
    }
    return { playableSystemName: playableName, playableSize }
  } catch (error) {
    await unlink(playablePath).catch(() => undefined)
    throw error
  }
}
