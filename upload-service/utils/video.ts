import { spawn } from 'child_process'

export function getVideoCodec(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      filePath,
    ])

    let output = ''
    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const codec = output.trim().toLowerCase()
        resolve(codec || 'unknown')
      } else {
        resolve('unknown')
      }
    })

    ffprobe.on('error', () => {
      resolve('unknown')
    })
  })
}

export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath,
    ])

    let output = ''
    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = Math.round(parseFloat(output.trim()))
        resolve(duration || 0)
      } else {
        resolve(0)
      }
    })

    ffprobe.on('error', () => {
      resolve(0)
    })
  })
}

export function needsCompression(codec: string): boolean {
  // H.264 (h264) and HEVC (h265/hevc) are already compressed
  const alreadyCompressed = ['h264', 'hevc', 'h265']
  return !alreadyCompressed.includes(codec.toLowerCase())
}

