# 📱 План разработки мобильного приложения SpokenWord

**Дата создания:** 2026-04-18  
**Статус:** В планировании  
**Приоритет:** Высокий  
**Оценка времени:** 2-3 недели

---

## 🎯 Цель проекта

Создать Android-приложение для SpokenWord с автоматическим определением доступного сервера. Решает проблему геоблокировок и доступности для пользователей с VPN или из-за границы.

### Ключевые требования

1. **Автоопределение сервера** — приложение само выбирает между `spoken-word.ru` и `spoken-word.info`
2. **Автопереключение** — при недоступности одного сервера переключается на другой
3. **Полный клиент** — все пользовательские функции (без админки)
4. **Публикация в Google Play** — официальный способ распространения

---

## 🏗️ Архитектура решения

### Серверы

| Сервер | URL | Назначение | Приоритет |
|--------|-----|------------|-----------|
| Основной | `https://www.spoken-word.ru` | Амстердам, основной хостинг | 1 |
| Зеркало | `https://www.spoken-word.info` | Резервный прокси | 2 |

### Логика выбора сервера

```
┌─────────────────────────────────────────────────────────────────┐
│                      ЗАПУСК ПРИЛОЖЕНИЯ                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Проверить кэшированный сервер (если есть)                   │
│     - Если доступен → использовать                              │
│     - Если недоступен → перейти к шагу 2                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Проверить все серверы параллельно                           │
│     - GET /api/health с таймаутом 3 сек                         │
│     - Выбрать первый ответивший по приоритету                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Сохранить выбор в AsyncStorage                              │
│     - Ключ: activeServer                                        │
│     - Значение: URL сервера                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Фоновая проверка каждые 5 минут                             │
│     - Если основной сервер стал доступен → переключиться        │
└─────────────────────────────────────────────────────────────────┘
```

### Обработка ошибок сети

```
┌─────────────────────────────────────────────────────────────────┐
│                      ЛЮБОЙ API ЗАПРОС                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Успешно?      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
        ┌─────────┐                  ┌─────────────┐
        │   Да    │                  │    Нет      │
        └────┬────┘                  └──────┬──────┘
             │                              │
             ▼                              ▼
     ┌───────────────┐          ┌────────────────────┐
     │ Вернуть ответ │          │ Переключить сервер │
     └───────────────┘          │ и повторить запрос │
                                └────────────────────┘
```

---

## 📁 Структура файлов приложения

```
spokenword/
├── capacitor.config.ts          # Конфигурация Capacitor
├── android/                     # Android-проект (генерируется)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/
│   │   │       ├── mipmap-*/     # Иконки приложения
│   │   │       └── values/       # Цвета, строки
│   │   └── build.gradle
│   └── build.gradle
├── lib/
│   ├── mobile/
│   │   ├── servers.ts           # Конфигурация серверов
│   │   ├── serverSelector.ts    # Логика выбора сервера
│   │   ├── apiClient.ts         # API клиент с автопереключением
│   │   └── pushNotifications.ts # Пуш-уведомления (опционально)
│   └── ...
├── components/
│   └── mobile/
│       └── ServerStatus.tsx     # Индикатор текущего сервера
└── app/
    └── api/
        └── health/
            └── route.ts         # Health check эндпоинт
```

---

## 📋 Детальный план по этапам

### Этап 1: Подготовка серверной части (1 день)

#### 1.1. Создать `/api/health` эндпоинт

**Файл:** `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { redis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
    server: process.env.SERVER_ID || 'primary',
    responseTime: 0,
  }
  
  try {
    // Проверка базы данных
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {}
  
  try {
    // Проверка Redis
    await redis.ping()
    checks.redis = true
  } catch {}
  
  checks.responseTime = Date.now() - startTime
  
  const isHealthy = checks.database && checks.redis
  
  return NextResponse.json(checks, { 
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  })
}
```

#### 1.2. Добавить переменную окружения

```bash
# .env.production на spoken-word.ru
SERVER_ID=primary

# .env.production на spoken-word.info
SERVER_ID=mirror
```

#### 1.3. Задеплоить на оба сервера

```bash
npm run deploy
# Затем на зеркале обновить код
```

---

### Этап 2: Настройка Capacitor (2-3 часа)

#### 2.1. Установка зависимостей

```bash
npm install @capacitor/core @capacitor/cli @capacitor/preferences @capacitor/app @capacitor/splash-screen @capacitor/status-bar
```

#### 2.2. Инициализация Capacitor

```bash
npx cap init "SpokenWord" "ru.spokenword.app" --web-dir=out
```

#### 2.3. Создать конфигурацию

**Файл:** `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ru.spokenword.app',
  appName: 'SpokenWord',
  webDir: 'out',
  server: {
    // В production — без live reload
    // В development можно указать URL для тестирования
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#a855f7',
    },
    StatusBar: {
      backgroundColor: '#1a1a2e',
      style: 'DARK',
    },
  },
  android: {
    allowMixedContent: true, // Для development
    backgroundColor: '#1a1a2e',
  },
}

export default config
```

#### 2.4. Добавить Android платформу

```bash
npx cap add android
```

#### 2.5. Настроить статический экспорт Next.js

**Файл:** `next.config.ts` — добавить:

```typescript
const nextConfig = {
  output: 'export',
  // ... остальные настройки
}
```

**Важно:** Для мобильного приложения нужен статический экспорт. API запросы будут идти к серверам напрямую.

---

### Этап 3: Модуль выбора сервера (1 день)

#### 3.1. Конфигурация серверов

**Файл:** `lib/mobile/servers.ts`

```typescript
export interface ServerConfig {
  id: string
  name: string
  apiUrl: string
  healthCheck: string
  priority: number
}

export const SERVERS: ServerConfig[] = [
  {
    id: 'primary',
    name: 'Основной сервер',
    apiUrl: 'https://www.spoken-word.ru',
    healthCheck: 'https://www.spoken-word.ru/api/health',
    priority: 1,
  },
  {
    id: 'mirror',
    name: 'Зеркало',
    apiUrl: 'https://www.spoken-word.info',
    healthCheck: 'https://www.spoken-word.info/api/health',
    priority: 2,
  },
]

// Список серверов можно обновлять динамически
export const SERVERS_CONFIG_URL = 'https://raw.githubusercontent.com/your-repo/config/servers.json'
```

#### 3.2. Логика выбора сервера

**Файл:** `lib/mobile/serverSelector.ts`

```typescript
import { Preferences } from '@capacitor/preferences'
import { SERVERS, ServerConfig } from './servers'

const STORAGE_KEY = 'activeServer'
const HEALTH_TIMEOUT = 3000 // 3 секунды

interface HealthCheckResult {
  server: ServerConfig
  isAvailable: boolean
  responseTime: number
}

async function checkServerHealth(server: ServerConfig): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT)
    
    const response = await fetch(server.healthCheck, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    clearTimeout(timeout)
    
    return {
      server,
      isAvailable: response.ok,
      responseTime: Date.now() - startTime,
    }
  } catch {
    return {
      server,
      isAvailable: false,
      responseTime: Date.now() - startTime,
    }
  }
}

export async function checkAllServers(): Promise<HealthCheckResult[]> {
  const results = await Promise.all(
    SERVERS.map(server => checkServerHealth(server))
  )
  
  // Сортируем по приоритету, затем по времени ответа
  return results.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1
    }
    if (a.server.priority !== b.server.priority) {
      return a.server.priority - b.server.priority
    }
    return a.responseTime - b.responseTime
  })
}

export async function selectBestServer(): Promise<string> {
  // Сначала проверяем кэшированный сервер
  const { value: cached } = await Preferences.get({ key: STORAGE_KEY })
  
  if (cached) {
    const cachedServer = SERVERS.find(s => s.apiUrl === cached)
    if (cachedServer) {
      const result = await checkServerHealth(cachedServer)
      if (result.isAvailable) {
        console.log(`[ServerSelector] Используем кэшированный сервер: ${cachedServer.name}`)
        return cached
      }
    }
  }
  
  // Проверяем все серверы
  console.log('[ServerSelector] Проверяем все серверы...')
  const results = await checkAllServers()
  
  const available = results.find(r => r.isAvailable)
  
  if (available) {
    console.log(`[ServerSelector] Выбран сервер: ${available.server.name} (${available.responseTime}ms)`)
    await Preferences.set({ key: STORAGE_KEY, value: available.server.apiUrl })
    return available.server.apiUrl
  }
  
  // Fallback — первый сервер
  console.warn('[ServerSelector] Ни один сервер не доступен, используем первый по умолчанию')
  return SERVERS[0].apiUrl
}

export async function getCurrentServer(): Promise<string> {
  const { value } = await Preferences.get({ key: STORAGE_KEY })
  return value || SERVERS[0].apiUrl
}

export async function forceServerSwitch(): Promise<string> {
  // Принудительное переключение на следующий доступный сервер
  const current = await getCurrentServer()
  const results = await checkAllServers()
  
  const nextAvailable = results.find(r => r.isAvailable && r.server.apiUrl !== current)
  
  if (nextAvailable) {
    await Preferences.set({ key: STORAGE_KEY, value: nextAvailable.server.apiUrl })
    return nextAvailable.server.apiUrl
  }
  
  return current
}

// Информация о текущем сервере для UI
export function getServerInfo(url: string): { name: string; emoji: string } {
  const server = SERVERS.find(s => s.apiUrl === url)
  if (!server) return { name: 'Неизвестный', emoji: '❓' }
  
  return {
    name: server.name,
    emoji: server.id === 'primary' ? '🏠' : '🌐',
  }
}
```

#### 3.3. API клиент с автопереключением

**Файл:** `lib/mobile/apiClient.ts`

```typescript
import { selectBestServer, forceServerSwitch, getCurrentServer } from './serverSelector'

let currentServerUrl: string | null = null
let isInitialized = false

// Слушатели изменения сервера
type ServerChangeListener = (newServer: string) => void
const listeners: ServerChangeListener[] = []

export function onServerChange(listener: ServerChangeListener) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) listeners.splice(index, 1)
  }
}

function notifyServerChange(newServer: string) {
  listeners.forEach(listener => listener(newServer))
}

export async function initializeApiClient(): Promise<string> {
  if (!isInitialized) {
    currentServerUrl = await selectBestServer()
    isInitialized = true
    console.log(`[ApiClient] Инициализирован с сервером: ${currentServerUrl}`)
  }
  return currentServerUrl!
}

export async function getApiBaseUrl(): Promise<string> {
  if (!currentServerUrl) {
    currentServerUrl = await getCurrentServer()
  }
  return currentServerUrl
}

interface FetchOptions extends RequestInit {
  skipRetry?: boolean
}

export async function apiFetch(path: string, options: FetchOptions = {}): Promise<Response> {
  if (!currentServerUrl) {
    await initializeApiClient()
  }
  
  const url = `${currentServerUrl}${path}`
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Для cookies (авторизация)
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    // Если сервер вернул 5xx ошибку — пробуем другой сервер
    if (response.status >= 500 && !options.skipRetry) {
      throw new Error(`Server error: ${response.status}`)
    }
    
    return response
  } catch (error) {
    if (options.skipRetry) {
      throw error
    }
    
    console.warn(`[ApiClient] Ошибка запроса к ${url}, переключаем сервер...`)
    
    // Переключаемся на другой сервер
    const newServer = await forceServerSwitch()
    
    if (newServer !== currentServerUrl) {
      currentServerUrl = newServer
      notifyServerChange(newServer)
      
      // Повторяем запрос
      const newUrl = `${currentServerUrl}${path}`
      return fetch(newUrl, {
        ...options,
        skipRetry: true,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      } as FetchOptions)
    }
    
    throw error
  }
}

// Хелперы для типичных запросов
export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path)
  return response.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return response.json()
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await apiFetch(path, {
    method: 'DELETE',
  })
  return response.json()
}
```

---

### Этап 4: Адаптация клиентского кода (2-3 дня)

#### 4.1. Страницы для мобильного приложения

| Страница | Путь | Статус | Примечания |
|----------|------|--------|------------|
| Главная | `/` | Нужна адаптация | Убрать Server Components |
| Логин | `/login` | Работает | Уже client-side |
| Регистрация | `/register` | Работает | Уже client-side |
| Чат | `/chat` | Работает | Уже client-side, заменить fetch |
| Профиль | `/profile` | Нужна адаптация | Конвертировать в client |
| Архив конференций | `/conf-arch` | Нужна адаптация | Конвертировать в client |
| Занятия | `/class` | Работает | Уже client-side |
| Платные материалы | `/paid-content` | Нужна адаптация | Конвертировать в client |
| Аудио | `/audio` | Нужна адаптация | Проверить плеер |

#### 4.2. Замена fetch на apiClient

**До:**
```typescript
const res = await fetch('/api/chat/rooms')
```

**После:**
```typescript
import { apiFetch } from '@/lib/mobile/apiClient'
const res = await apiFetch('/api/chat/rooms')
```

#### 4.3. Обработка авторизации

Для мобильного приложения нужно:
1. Хранить токен в `@capacitor/preferences`
2. Добавлять токен в заголовки запросов
3. Обрабатывать 401 ошибки (редирект на логин)

**Файл:** `lib/mobile/auth.ts`

```typescript
import { Preferences } from '@capacitor/preferences'

const TOKEN_KEY = 'authToken'

export async function setAuthToken(token: string) {
  await Preferences.set({ key: TOKEN_KEY, value: token })
}

export async function getAuthToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: TOKEN_KEY })
  return value
}

export async function clearAuthToken() {
  await Preferences.remove({ key: TOKEN_KEY })
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken()
  return !!token
}
```

---

### Этап 5: UI компоненты для мобильного (1 день)

#### 5.1. Индикатор сервера

**Файл:** `components/mobile/ServerStatus.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getCurrentServer, getServerInfo, onServerChange } from '@/lib/mobile/serverSelector'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function ServerStatus() {
  const [server, setServer] = useState<string>('')
  const [isOnline, setIsOnline] = useState(true)
  
  useEffect(() => {
    getCurrentServer().then(setServer)
    
    const unsubscribe = onServerChange(setServer)
    
    const checkOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', checkOnline)
    window.addEventListener('offline', checkOnline)
    
    return () => {
      unsubscribe()
      window.removeEventListener('online', checkOnline)
      window.removeEventListener('offline', checkOnline)
    }
  }, [])
  
  const { name, emoji } = getServerInfo(server)
  
  return (
    <div className="flex items-center gap-2 text-xs text-purple-300/60 px-3 py-1 bg-purple-900/20 rounded-full">
      {isOnline ? (
        <Wifi className="w-3 h-3 text-green-400" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-400" />
      )}
      <span>{emoji} {name}</span>
    </div>
  )
}
```

#### 5.2. Splash Screen (экран загрузки)

**Файл:** `components/mobile/SplashScreen.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { initializeApiClient } from '@/lib/mobile/apiClient'
import { SplashScreen as CapSplash } from '@capacitor/splash-screen'

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function init() {
      try {
        await initializeApiClient()
        setIsReady(true)
        await CapSplash.hide()
      } catch (err) {
        setError('Не удалось подключиться к серверу')
        await CapSplash.hide()
      }
    }
    
    init()
  }, [])
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }
  
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Подключение...</p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
```

---

### Этап 6: Подготовка Android-проекта (1 день)

#### 6.1. Иконка приложения

Нужны иконки разных размеров:
- `mipmap-mdpi`: 48x48
- `mipmap-hdpi`: 72x72
- `mipmap-xhdpi`: 96x96
- `mipmap-xxhdpi`: 144x144
- `mipmap-xxxhdpi`: 192x192

Можно использовать [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/).

#### 6.2. Splash Screen

**Файл:** `android/app/src/main/res/drawable/splash.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item
        android:drawable="@drawable/ic_launcher_foreground"
        android:gravity="center"
        android:width="128dp"
        android:height="128dp"/>
</layer-list>
```

#### 6.3. Цвета

**Файл:** `android/app/src/main/res/values/colors.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_background">#1a1a2e</color>
    <color name="colorPrimary">#a855f7</color>
    <color name="colorPrimaryDark">#7c3aed</color>
    <color name="colorAccent">#a855f7</color>
</resources>
```

#### 6.4. Разрешения

**Файл:** `android/app/src/main/AndroidManifest.xml` — добавить:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

### Этап 7: Сборка и тестирование (2-3 дня)

#### 7.1. Сборка для тестирования

```bash
# Собрать Next.js статику
npm run build

# Скопировать в Capacitor
npx cap copy android

# Открыть в Android Studio
npx cap open android
```

#### 7.2. Тестирование на эмуляторе

1. Запустить эмулятор Android в Android Studio
2. Нажать Run (зелёный треугольник)
3. Проверить:
   - [ ] Запуск приложения
   - [ ] Определение сервера
   - [ ] Авторизация
   - [ ] Чат (отправка/получение)
   - [ ] Просмотр видео
   - [ ] Профиль
   - [ ] Переключение серверов при недоступности

#### 7.3. Тестирование на реальном устройстве

1. Включить режим разработчика на телефоне
2. Подключить по USB
3. Запустить через Android Studio

#### 7.4. Чеклист тестирования

- [ ] Приложение запускается без ошибок
- [ ] Splash screen отображается корректно
- [ ] Сервер определяется автоматически
- [ ] Логин работает
- [ ] Регистрация работает
- [ ] Чат отправляет/получает сообщения
- [ ] Видео воспроизводится
- [ ] При отключении сервера происходит переключение
- [ ] Индикатор сервера отображается
- [ ] Кнопка "назад" работает корректно
- [ ] Приложение не падает при потере сети

---

### Этап 8: Публикация в Google Play (1-2 дня)

#### 8.1. Подготовка к публикации

1. **Создать аккаунт разработчика Google Play** ($25 единоразово)
   - https://play.google.com/console

2. **Создать keystore для подписи**
   ```bash
   keytool -genkey -v -keystore spokenword-release.keystore -alias spokenword -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **Собрать release APK/AAB**
   ```bash
   # В Android Studio: Build → Generate Signed Bundle / APK
   # Выбрать Android App Bundle (AAB)
   ```

#### 8.2. Материалы для Google Play

| Материал | Размер | Описание |
|----------|--------|----------|
| Иконка | 512x512 | PNG, без альфа-канала |
| Feature graphic | 1024x500 | Баннер приложения |
| Скриншоты телефон | 1080x1920 | Минимум 2, максимум 8 |
| Скриншоты планшет | 1200x1920 | Опционально |

#### 8.3. Описание приложения

**Короткое описание (80 символов):**
```
Духовные лекции, чат с единомышленниками, архив записей
```

**Полное описание:**
```
SpokenWord — приложение для духовного развития и общения.

✨ Возможности:
• Прямые трансляции лекций
• Архив записей конференций
• Чат с единомышленниками
• Платные курсы и семинары
• Аудио-материалы

🌐 Автоматический выбор сервера:
Приложение само определяет оптимальный сервер для вашего региона, обеспечивая стабильное соединение.

👥 Сообщество:
Общайтесь с другими участниками, задавайте вопросы модераторам, делитесь впечатлениями.
```

#### 8.4. Категория и возрастной рейтинг

- **Категория:** Education или Lifestyle
- **Возрастной рейтинг:** Для всех (PEGI 3)

---

## 🔧 Команды разработки

```bash
# Установка зависимостей Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/preferences @capacitor/app @capacitor/splash-screen @capacitor/status-bar

# Инициализация
npx cap init "SpokenWord" "ru.spokenword.app" --web-dir=out

# Добавить Android
npx cap add android

# Сборка Next.js
npm run build

# Синхронизация с Capacitor
npx cap sync android

# Открыть в Android Studio
npx cap open android

# Live reload для разработки
npx cap run android --livereload --external
```

---

## 📊 Метрики успеха

| Метрика | Цель | Как измерять |
|---------|------|--------------|
| Время запуска | < 3 сек | Тестирование |
| Успешное определение сервера | > 99% | Логи |
| Автопереключение при ошибке | < 5 сек | Тестирование |
| Crash-free sessions | > 99.5% | Firebase Crashlytics |
| Оценка в Play Store | > 4.0 | Google Play Console |

---

## 🚨 Риски и их митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Оба сервера недоступны | Низкая | Показать сообщение + retry |
| Проблемы с авторизацией | Средняя | Тщательное тестирование |
| Видео не воспроизводится | Средняя | Использовать нативный плеер |
| Отказ Google Play | Низкая | Соблюдать гайдлайны |

---

## 📅 Timeline

| Неделя | Этапы | Результат |
|--------|-------|-----------|
| **1** | 1-3 | Серверная часть + Capacitor + модуль серверов |
| **2** | 4-6 | Адаптация кода + UI + Android-проект |
| **3** | 7-8 | Тестирование + публикация |

---

## 🔮 Будущие улучшения (v2.0)

1. **Пуш-уведомления** — новые сообщения в чате, начало трансляции
2. **Оффлайн-режим** — кэширование аудио и видео
3. **iOS версия** — добавить `npx cap add ios`
4. **Биометрическая авторизация** — вход по отпечатку
5. **Виджеты** — расписание на главном экране
6. **Тёмная/светлая тема** — по системным настройкам

---

_Документ создан: 2026-04-18_  
_Автор: AI Assistant_
