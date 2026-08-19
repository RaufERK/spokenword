import redis from '@/lib/redis'

type MemoryEntry = {
  count: number
  resetAt: number
}

const memory = new Map<string, MemoryEntry>()

function consumeMemoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const current = memory.get(key)

  if (!current || current.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  current.count += 1
  return current.count <= max
}

export async function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const redisKey = `rl:${key}`

  try {
    const count = await redis.incr(redisKey)
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs)
    }
    return count <= max
  } catch {
    return consumeMemoryLimit(key, max, windowMs)
  }
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  return realIp && realIp.length > 0 ? realIp : 'unknown'
}
