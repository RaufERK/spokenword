# ПЛАН: Чат с комнатами (личка, поддержка, общий)

**Статус:** В разработке (ждём финальный макет FigmaV28)  
**Дата:** 2026-04-17

---

## Концепция

Переход от плоского общего чата к мессенджеру с боковой панелью и тремя типами комнат.

### Типы комнат

| Тип | Описание | Кто видит |
|-----|----------|-----------|
| `GENERAL` | Общий чат — один на весь сайт | Все авторизованные |
| `SUPPORT` | Поддержка — тред пользователь ↔ все админы | Создатель + все ADMIN/SUPER |
| `PRIVATE` | Личка — диалог двух пользователей | Только два участника |

### Договорённости

- Поддержка: **один тред** на пользователя, видят все ADMIN/SUPER и этот конкретный пользователь
- Личка: **строго приватная**, ни модераторы, ни админы не видят чужие диалоги
- Начать личку можно двумя способами:
  1. Кликнуть на имя автора в общем чате
  2. Поиск пользователей (поле поиска в боковой панели)
- Реакции — во всех типах комнат (как в Telegram)

---

## Изменения в базе данных

### Новая модель: `ChatRoom`

```prisma
enum ChatRoomType {
  GENERAL
  SUPPORT
  PRIVATE
}

model ChatRoom {
  id        Int          @id @default(autoincrement())
  type      ChatRoomType
  createdAt DateTime     @default(now())

  messages     ChatMessage[]
  participants ChatRoomParticipant[]
}
```

### Новая модель: `ChatRoomParticipant`

```prisma
model ChatRoomParticipant {
  id         Int       @id @default(autoincrement())
  roomId     Int
  userId     Int
  lastReadAt DateTime? // для счётчика непрочитанных

  room ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
}
```

### Обновление: `ChatMessage`

Добавляем `roomId`:

```prisma
model ChatMessage {
  id        Int      @id @default(autoincrement())
  roomId    Int                        // NEW
  userId    Int
  text      String
  link      String?
  reactions String   @default("{}")
  createdAt DateTime @default(now())

  room ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([roomId, createdAt])
  @@index([createdAt])
}
```

### Миграция существующих сообщений

Старые `ChatMessage` без `roomId` переносятся в GENERAL-комнату прямо в SQL-миграции:

```sql
-- 1. Создать GENERAL комнату
INSERT INTO "ChatRoom" ("type", "createdAt") VALUES ('GENERAL', NOW());

-- 2. Привязать все старые сообщения к ней
UPDATE "ChatMessage" SET "roomId" = (SELECT id FROM "ChatRoom" WHERE type = 'GENERAL' LIMIT 1);
```

---

## API эндпоинты

### Новые

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/api/chat/rooms` | Список моих комнат (lastMessage, unreadCount) |
| `POST` | `/api/chat/rooms` | Создать SUPPORT или найти/создать PRIVATE |
| `GET` | `/api/chat/rooms/[id]` | Сообщения конкретной комнаты |
| `POST` | `/api/chat/rooms/[id]` | Отправить сообщение в комнату |
| `GET` | `/api/chat/users/search?q=` | Поиск пользователей для начала личной беседы |

### Существующие (обновляются)

| Метод | URL | Что меняется |
|-------|-----|--------------|
| `GET` | `/api/chat` | Убираем (заменяется на `/api/chat/rooms/[id]`) |
| `POST` | `/api/chat` | Убираем (заменяется на `/api/chat/rooms/[id]`) |
| `DELETE` | `/api/chat/[id]` | Остаётся, работает по roomId |
| `POST` | `/api/chat/[id]` | Остаётся (реакции) |

---

## Логика создания комнаты (POST /api/chat/rooms)

```ts
// Тело запроса:
// { type: "SUPPORT" }                   — поддержка для текущего юзера
// { type: "PRIVATE", participantId: 12 } — личка с пользователем 12

// PRIVATE: ищем существующую комнату между двумя юзерами
// Если нет — создаём новую с двумя participants
// Если есть — возвращаем существующую (idempotent)

// SUPPORT: ищем существующую SUPPORT-комнату этого юзера
// Если нет — создаём одну с userId как единственным участником
// Админы видят все SUPPORT-комнаты через запрос по роли, не через participants
```

---

## Поиск пользователей

`GET /api/chat/users/search?q=Елена`

- Ищем по `firstName + lastName` (ILIKE)
- Исключаем самого себя из результатов
- Возвращаем: `id, firstName, lastName, role`
- Лимит: 10 результатов

**UI поведение:**
- Поле поиска в боковой панели чата
- Результаты выпадают под полем
- Клик на результат → `POST /api/chat/rooms` → переход в комнату

---

## UI изменения

### Структура страницы `/chat`

```
┌─────────────────────────────────────────────────────┐
│  [боковая панель 280px]  │  [активный чат — flex-1] │
│                          │                           │
│  🔍 Поиск пользователей  │  📢 Общий чат             │
│  ─────────────────────── │  ─────────────────────── │
│  📢 Общий чат        [3] │  [сообщения]              │
│  🛟 Поддержка            │                           │
│  💬 Елена Иванова    [1] │  [форма ввода]            │
│  💬 Алексей К.           │                           │
└──────────────────────────┴───────────────────────────┘
```

### Файлы которые меняются

- `app/chat/page.tsx` — полный рерайт под двухпанельный layout
- `app/api/chat/route.ts` — убираем/переделываем
- `app/api/chat/[id]/route.ts` — обновляем
- `app/api/chat/rooms/route.ts` — новый
- `app/api/chat/rooms/[id]/route.ts` — новый
- `app/api/chat/users/search/route.ts` — новый
- `prisma/schema.prisma` — добавляем `ChatRoom`, `ChatRoomParticipant`, обновляем `ChatMessage`
- `prisma/migrations/...` — новая миграция

---

## Polling оптимизация (добавляем вместе с рефактором)

```ts
useEffect(() => {
  // Пауза когда вкладка скрыта
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      clearInterval(intervalRef.current)
    } else {
      fetchMessages()
      intervalRef.current = setInterval(fetchMessages, 5000)
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  return () => document.removeEventListener('visibilitychange', handleVisibility)
}, [])
```

---

## Порядок реализации

1. **БД** — схема + миграция (с переносом старых сообщений в GENERAL)
2. **API** — все эндпоинты
3. **UI** — рерайт `chat/page.tsx` под макет (ждём FigmaV28)
4. **Polling** — оптимизация вместе с UI

---

## Что НЕ меняем

- Реакции — та же JSON-строка в `ChatMessage`
- Права удаления — MODERATOR/ADMIN/SUPER удаляют в любой комнате
- Ограничение на ссылки для обычных пользователей — остаётся в GENERAL, в личке и поддержке — снимаем

---

_Ждём финальный макет FigmaV28 для начала реализации UI._
