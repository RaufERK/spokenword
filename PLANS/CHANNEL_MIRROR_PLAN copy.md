# CHANNEL MIRROR BOT — Детальный план реализации

## Цель

Создать систему полного зеркалирования Telegram-канала партнёров на сайте:
- Новый пост → появляется на сайте
- Редактирование поста → обновляется на сайте
- Удаление поста → удаляется на сайте
- Медиа (фото, видео, документы, альбомы) → хранится и отображается на сайте

---

## Архитектура

```
Telegram-канал
     │
     │ Telegraf (polling)
     ▼
channel-mirror-bot  ← отдельный Node.js/TS проект + PM2
     │
     │ POST /api/mirror/sync  (Bearer token)
     ▼
Next.js сайт
     │
     ▼
Prisma → PostgreSQL
     │
     ▼
Публичная страница /channel
```

---

## Проект 1: channel-mirror-bot (новый микросервис)

### Стек
- Node.js 24 + TypeScript
- Telegraf 4.x
- node-fetch (для отправки файлов на сайт)
- dotenv
- PM2

### Структура проекта

```
channel-mirror-bot/
├── src/
│   ├── bot.ts              ← главный файл, Telegraf init
│   ├── handlers/
│   │   ├── newPost.ts      ← обработка новых постов
│   │   ├── editPost.ts     ← обработка редактирований
│   │   └── deletePost.ts   ← обработка удалений
│   ├── utils/
│   │   ├── mediaDownload.ts ← скачивание файлов из Telegram
│   │   ├── apiClient.ts     ← отправка данных на сайт
│   │   └── messageParser.ts ← парсинг типов сообщений
│   └── types.ts            ← TypeScript типы
├── ecosystem.config.cjs    ← PM2 конфиг
├── tsconfig.json
├── package.json
└── .env
```

### .env

```env
BOT_TOKEN=<telegram bot token — НОВЫЙ бот, не SMART_BOT>
CHANNEL_ID=<id или @username партнёрского канала>
SITE_API_URL=https://your-site.com/api/mirror/sync
SITE_API_SECRET=<случайный длинный секрет, совпадает с сайтом>
```

### Ключевые обработчики

#### bot.ts — регистрация хуков

```typescript
import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.BOT_TOKEN!)

// Новые посты
bot.on('channel_post', handleNewPost)

// Редактирование постов
bot.on('edited_channel_post', handleEditPost)

// Удаление — через raw update (message_id)
bot.use(async (ctx) => {
  const update = ctx.update as any
  if (update.channel_post?.delete_chat_message) {
    await handleDeletePost(update)
  }
})

bot.launch()
```

#### newPost.ts — типы контента для обработки

```typescript
// Поддерживаемые типы:
// - text (plain text + entities для форматирования)
// - photo (одиночное фото + caption)
// - video (видео + caption)
// - document (файл + caption)
// - audio
// - voice
// - sticker
// - media_group (альбом — несколько фото/видео)
//   ⚠️ media_group собирается руками: 
//   копим сообщения с одинаковым media_group_id 
//   в Map, через 1.5s flush → отправляем как группу
```

#### mediaDownload.ts — скачивание файлов

```typescript
// 1. Получить file_path через Telegram getFile API
// 2. Скачать файл: https://api.telegram.org/file/bot{TOKEN}/{file_path}
// 3. Передать как Buffer в FormData при отправке на сайт
// Поддерживать: photo (все размеры → берём largest), 
//               video, document, audio, voice
```

#### apiClient.ts — отправка на сайт

```typescript
// POST https://site.com/api/mirror/sync
// Headers: Authorization: Bearer SITE_API_SECRET
// Body: FormData (если есть файлы) или JSON (только текст)

// Структура payload:
// {
//   action: 'create' | 'update' | 'delete',
//   telegramMessageId: number,
//   channelId: string,
//   date: number,           // unix timestamp
//   text?: string,
//   entities?: TelegramEntity[],
//   mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker',
//   mediaGroupId?: string,  // для альбомов
//   file?: Buffer,          // бинарный файл
//   fileName?: string,
//   mimeType?: string,
// }
```

### Обработка media_group (альбомы)

```typescript
// Telegram присылает каждое фото/видео альбома как отдельное сообщение
// с одинаковым media_group_id. Нужно собрать группу:

const pendingGroups = new Map<string, Message[]>()
const groupTimers = new Map<string, NodeJS.Timeout>()

function addToGroup(msg: Message) {
  const groupId = msg.media_group_id!
  
  if (!pendingGroups.has(groupId)) {
    pendingGroups.set(groupId, [])
    // Через 1500ms — флашим группу на сайт
    groupTimers.set(groupId, setTimeout(() => {
      const messages = pendingGroups.get(groupId)!
      flushGroup(groupId, messages)
      pendingGroups.delete(groupId)
      groupTimers.delete(groupId)
    }, 1500))
  }
  
  pendingGroups.get(groupId)!.push(msg)
}
```

### PM2 ecosystem.config.cjs

```javascript
module.exports = {
  apps: [{
    name: 'channel-mirror-bot',
    script: 'dist/bot.js',
    node_args: '--max-old-space-size=256',
    max_memory_restart: '300M',
    restart_delay: 5000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

---

## Проект 2: Next.js сайт — изменения

### 1. Prisma schema — новая таблица

```prisma
model ChannelPost {
  id                Int       @id @default(autoincrement())
  telegramMessageId Int       @unique
  channelId         String
  text              String?
  entities          Json?     // Telegram entities для форматирования
  mediaType         String?   // 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker'
  mediaUrl          String?   // URL сохранённого файла на сервере
  mediaGroupId      String?   // для объединения альбомов
  mediaGroupItems   Json?     // массив URL для альбомов
  caption           String?   // подпись к медиа
  captionEntities   Json?
  telegramDate      DateTime
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  isDeleted         Boolean   @default(false)
  
  @@index([channelId, telegramDate(sort: Desc)])
  @@index([mediaGroupId])
}
```

### 2. API Route — /api/mirror/sync

```
app/api/mirror/sync/route.ts
```

Логика:
- Проверить `Authorization: Bearer SECRET` (сравнить с env `MIRROR_API_SECRET`)
- Если `action === 'create'`:
  - Сохранить пост в `ChannelPost`
  - Если есть файл в FormData → сохранить в `/public/channel-media/` или S3
- Если `action === 'update'`:
  - `prisma.channelPost.update({ where: { telegramMessageId } })`
- Если `action === 'delete'`:
  - `prisma.channelPost.update({ where: { telegramMessageId }, data: { isDeleted: true } })`
  - Или `prisma.channelPost.delete(...)` — по желанию заказчика

Возвращает `{ ok: true }` или `{ error: string }` с соответствующим статусом.

### 3. Публичная страница — /channel

```
app/channel/page.tsx        ← список постов (SSG/ISR каждые 60 сек)
app/channel/[id]/page.tsx   ← отдельный пост (опционально)
```

Компоненты:
- `PostCard` — отображение одного поста (текст с форматированием, фото, видео)
- `MediaGallery` — альбом фото
- `VideoPlayer` — видео (уже есть hls.js в стеке)

Форматирование текста:
- Использовать `entities` из Telegram для bold, italic, code, links, spoiler и т.д.
- Написать утилиту `renderTelegramEntities(text, entities) → ReactNode`

### 4. .env добавить

```env
MIRROR_API_SECRET=<тот же секрет что в боте>
```

---

## Порядок реализации (по шагам)

### Шаг 1 — Сайт: Prisma schema + миграция
- Добавить модель `ChannelPost` в `schema.prisma`
- Запустить `npx prisma migrate dev --name add-channel-posts`

### Шаг 2 — Сайт: API route `/api/mirror/sync`
- Реализовать create/update/delete
- Добавить авторизацию по Bearer token
- Добавить сохранение файлов (локально или S3/Cloudflare R2)

### Шаг 3 — Сайт: Страница `/channel`
- Список постов из БД
- Компоненты для разных типов медиа

### Шаг 4 — Бот: инициализация проекта
- `npm init`, TypeScript, Telegraf
- Реализовать `messageParser.ts` + `apiClient.ts`

### Шаг 5 — Бот: обработчики
- `newPost.ts` с поддержкой всех типов
- `editPost.ts`
- `deletePost.ts`
- `media_group` collector

### Шаг 6 — Бот: скачивание файлов
- `mediaDownload.ts`
- Проверить все типы медиа

### Шаг 7 — Интеграционное тестирование
- Запустить бота локально
- Пост в тестовый канал → проверить появление на сайте
- Редактирование → проверить обновление
- Удаление → проверить скрытие

### Шаг 8 — Деплой
- Бот: `npm run build && pm2 start ecosystem.config.cjs`
- Сайт: обычный деплой

---

## Открытые вопросы (уточнить с заказчиком)

1. **Хранение файлов**: локально на сервере (`/public/uploads/`) или облако (S3 / Cloudflare R2)?
2. **Удаление**: физически удалять пост из БД или помечать `isDeleted: true` (soft delete)?
3. **Real-time**: нужно ли мгновенное обновление на сайте без перезагрузки (SSE / WebSocket через Redis pub/sub — уже есть ioredis)?
4. **Авторизация**: страница `/channel` публичная или нужна авторизация (next-auth уже есть)?
5. **История**: показывать все посты начиная с какой даты или только новые?

---

## Безопасность

- Бот → Сайт: Bearer token (не хранить в коде, только .env)
- На сайте: rate limit на `/api/mirror/sync` (рекомендация для MVP: 60 req/min, настраивается через env)
- Файлы: валидировать MIME type перед сохранением
- Не принимать файлы > 50MB (лимит Telegram Bot API)
- Следующий этап: добавить IP allowlist для `/api/mirror/sync` (разрешить только IP сервера бота)

---

## Что НЕ делать

- ❌ Не использовать SMART_BOT для этой задачи (разные домены ответственности)
- ❌ Не хранить Telegram Bot Token в коде сайта
- ❌ Не делать polling на стороне сайта (Next.js не для этого)
- ❌ Не смешивать channel-mirror-bot и SMART_BOT в одном процессе

---

_Документ создан: 2026-04-20_  
_Версия: 1.0_
