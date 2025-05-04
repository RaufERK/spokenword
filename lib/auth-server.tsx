// lib/auth-server.ts
import { cookies } from 'next/headers'
import { checkToken } from 'auth-jwt'

const JWT_SECRET = process.env.JWT_SECRET!

// Опишите интерфейс ожидаемого полезного содержимого токена
interface JwtPayload {
  user: string
  // другие поля, если нужны:
  [key: string]: unknown
}

export async function getSession(): Promise<{ user: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('spoken_auth')?.value
  if (!token) return null

  try {
    // Приводим результат к ожидаемому типу
    const payload = (await checkToken(token, JWT_SECRET)) as JwtPayload

    // Безопасно проверяем поле user
    if (typeof payload.user !== 'string') return null
    return { user: payload.user }
  } catch {
    return null
  }
}
