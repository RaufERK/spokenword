# План: Мероприятия + История оплат

**Статус:** В работе  
**Создан:** Апрель 2026  
**Тестирование:** spoken-word.guru → spoken-word.ru

---

## Суть изменений

Вводим сущность **Мероприятие (Event)** как центральный объект системы:
- Все оплаты привязаны к конкретному мероприятию
- Все видео в архиве привязаны к конкретному мероприятию
- Доступ к видео = оплатил это мероприятие + в пределах срока доступа
- Полная история оплат пользователя (список всех мероприятий)

---

## Бизнес-логика доступа

Пользователь видит видео если:
1. `ConferenceFile.eventId` совпадает с eventId в его `UserEventAccess`
2. Запись `UserEventAccess` имеет `status = ACTIVE`
3. `max(paymentDate, event.startDate) + event.accessDays > сейчас`

`User.accessUntil` = MAX дата окончания среди всех активных оплат пользователя (кэш для быстрой фильтрации в таблице).

---

## Шаг 1 — Схема Prisma

### Изменения в `Event`
```prisma
model Event {
  id         Int       @id @default(autoincrement())
  title      String    // "КОНФЕРЕНЦИЯ ВЕСНА 2026"
  startDate  DateTime
  accessDays Int       @default(30)  // ← НОВОЕ: дней доступа к архиву
  createdAt  DateTime  @default(now())

  payments   UserEventAccess[]
  files      ConferenceFile[]  // ← НОВОЕ
}
```

### Изменения в `UserEventAccess`
```prisma
enum PaymentStatus {
  ACTIVE
  REVOKED
}

model UserEventAccess {
  id          Int           @id @default(autoincrement())
  userId      Int
  eventId     Int
  paymentDate DateTime      @default(now())
  grantedBy   Int
  status      PaymentStatus @default(ACTIVE)  // ← НОВОЕ
  revokedBy   Int?                            // ← НОВОЕ
  revokedAt   DateTime?                       // ← НОВОЕ

  user        User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event       Event @relation(fields: [eventId], references: [id])
  admin       User  @relation("GrantedEventAccess", fields: [grantedBy], references: [id])
  revoker     User? @relation("RevokedEventAccess", fields: [revokedBy], references: [id])  // ← НОВОЕ

  // @@unique([userId, eventId]) — УБИРАЕМ, заменяем на index
  @@index([userId])
  @@index([eventId])
}
```

### Изменения в `ConferenceFile`
```prisma
model ConferenceFile {
  // ... существующие поля ...
  eventId  Int?   // ← НОВОЕ (nullable для обратной совместимости)
  event    Event? @relation(fields: [eventId], references: [id])
}
```

### Изменения в `User`
- Убрать `paymentDate` — дублирует `UserEventAccess.paymentDate`
- Оставить `accessUntil` — кэш для быстрой фильтрации

**Статус:** ✅ выполнено (2026-04-16)

---

## Шаг 2 — Миграция данных

После применения миграции схемы:

1. Проставить `status = ACTIVE` всем существующим `UserEventAccess` записям
2. Привязать существующие `ConferenceFile` без `eventId` к последнему мероприятию в базе

```sql
-- Активируем все существующие оплаты
UPDATE "UserEventAccess" SET status = 'ACTIVE' WHERE status IS NULL;

-- Привязываем старые файлы к последнему мероприятию
UPDATE "ConferenceFile" 
SET "eventId" = (SELECT id FROM "Event" ORDER BY "startDate" DESC LIMIT 1)
WHERE "eventId" IS NULL;
```

**Статус:** ⬜ не начато

---

## Шаг 3 — Утилита `recalculateAccessUntil`

Файл: `lib/access.ts`

```ts
// Пересчитывает User.accessUntil на основе всех активных UserEventAccess
// Вызывать при: добавлении оплаты, отзыве оплаты
async function recalculateAccessUntil(userId: number): Promise<void>
```

Логика:
1. Берём все ACTIVE записи `UserEventAccess` пользователя с join на `Event`
2. Для каждой: `endDate = max(paymentDate, event.startDate) + event.accessDays дней`
3. `User.accessUntil = MAX(endDate)` или `null` если нет активных

**Статус:** ⬜ не начато

---

## Шаг 4 — API мероприятий

| Метод | Endpoint | Описание |
|---|---|---|
| GET | `/api/admin/events` | Список всех мероприятий |
| POST | `/api/admin/events` | Создать мероприятие |
| PATCH | `/api/admin/events/[id]` | Редактировать |
| DELETE | `/api/admin/events/[id]` | Удалить (если нет привязанных оплат/видео) |

**Статус:** ⬜ не начато

---

## Шаг 5 — Обновить API оплат

### Grant (добавить оплату)
- Принимать `eventId` обязательно
- Создавать `UserEventAccess` с `status = ACTIVE`
- Вызывать `recalculateAccessUntil(userId)`

### Revoke (отозвать оплату)
- Ставить `status = REVOKED`, записывать `revokedBy`, `revokedAt`
- Не удалять запись (история!)
- Вызывать `recalculateAccessUntil(userId)`

### Массовые операции
- Grant/Revoke для нескольких пользователей с одним `eventId`

**Статус:** ⬜ не начато

---

## Шаг 6 — Страница `/admin/events`

- Список мероприятий (сортировка по дате, свежие сверху)
- Вычисляемый статус: `предстоящее` / `прошедшее`
- Для каждого: количество оплативших, количество видео
- Кнопка "Создать" → модалка (название, дата начала, дней доступа)
- Кнопка "Редактировать" → та же модалка

**Статус:** ⬜ не начато

---

## Шаг 7 — Обновить таблицу пользователей

- Колонка "Дата последней оплаты" → **"Последнее мероприятие"**
- Значение: краткое название + год, например `ВЕСНА 2026`
- Кнопка "+ОПЛАТА" → модалка с `<select>` мероприятий
- Новая кнопка "История" → модалка со списком всех оплат

**Статус:** ⬜ не начато

---

## Шаг 8 — Обновить загрузку видео

На странице `/upload`:
- Добавить обязательный `<select>` мероприятия
- Передавать `eventId` в upload service
- Upload service сохраняет `eventId` в `ConferenceFile`

**Статус:** ⬜ не начато

---

## Шаг 9 — Обновить логику доступа к видео

Страница `/conf-archive` и `/watch-conf/[systemName]`:
- Проверять не просто `user.accessUntil > now`
- А: `UserEventAccess` для `video.eventId` существует, ACTIVE, в пределах срока

**Статус:** ⬜ не начато

---

## Порядок выполнения

```
[ ] Шаг 1 — Prisma schema
[ ] Шаг 2 — Миграция данных
[ ] Шаг 3 — recalculateAccessUntil
[ ] Шаг 4 — API мероприятий
[ ] Шаг 5 — API оплат (обновление)
[ ] Шаг 6 — Страница /admin/events
[ ] Шаг 7 — Таблица пользователей
[ ] Шаг 8 — Загрузка видео
[ ] Шаг 9 — Логика доступа
```

---

## Деплой

```bash
# Тестируем на голландском сервере
npm run deploy:eu
# → проверяем на spoken-word.guru

# Когда всё ок — деплоим на боевой
npm run deploy
```
