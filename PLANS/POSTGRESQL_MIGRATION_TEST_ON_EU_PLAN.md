# PostgreSQL Migration — Test on EU Server Plan

Дата: 2026-04-15
Статус: в работе

## Идея

Использовать старый Amsterdam сервер (185.200.178.73) как полигон для PostgreSQL миграции.

**Почему это безопасно:**
- данные реальные (старая боевая база), но сервер не продакшен
- если что-то пойдёт не так — восстанавливаем одним файлом с РФ (`scp data.db`)
- РФ прод не трогаем до полного подтверждения результата
- сравниваем API-ответы EU-полигона с РФ-прода — если совпадают, мигрируем прод

## Архитектура полигона

```
eu.spoken-word.ru (185.200.178.73)
  ├── nginx → порт 3005 (Next.js)
  ├── PM2:
  │   ├── spokenword (Next.js)
  │   ├── spokenword-upload (Express)
  │   └── spokenword-compression-worker
  ├── PostgreSQL 16 (локально на сервере)
  └── Redis (уже active)
```

## Доступы

- root: `ssh amster`
- app user: `ssh amster_app`
- deploy: `npm run deploy:eu`

---

## Пошаговый план

### Шаг 1 — nginx + SSL для eu.spoken-word.ru
- [ ] 1.1. Создать nginx конфиг для `eu.spoken-word.ru`
- [ ] 1.2. Выпустить SSL сертификат через certbot
- [ ] 1.3. Настроить proxy → 127.0.0.1:3005

### Шаг 2 — Подготовить сервер к деплою приложения
- [ ] 2.1. Установить Node.js (nvm + LTS) для appuser
- [ ] 2.2. Создать структуру директорий `/home/appuser/apps/spokenword/{shared,source}`
- [ ] 2.3. Создать `.env` в shared (скопировать с РФ, поменять `DATABASE_URL`)
- [ ] 2.4. Добавить `deploy:eu` скрипт в package.json

### Шаг 3 — Установить PostgreSQL на EU сервер
- [ ] 3.1. `apt install postgresql-16`
- [ ] 3.2. Создать пользователя `spokenword` и БД `spokenword`
- [ ] 3.3. Проверить подключение

### Шаг 4 — Обновить Prisma schema под PostgreSQL
- [ ] 4.1. Поменять `provider = "sqlite"` → `"postgresql"` в `prisma/schema.prisma`
- [ ] 4.2. Добавить `DATABASE_URL` для PostgreSQL в `.env.pg` (уже есть для локалки)
- [ ] 4.3. Запустить `prisma migrate dev --name init` локально — сгенерировать миграции
- [ ] 4.4. Закоммитить новую миграцию

### Шаг 5 — Задеплоить приложение на EU полигон
- [ ] 5.1. `npm run deploy:eu` — деплой кода на Amsterdam
- [ ] 5.2. Проверить что PM2 запустился, сайт отвечает на `eu.spoken-word.ru`
- [ ] 5.3. Все таблицы должны создаться через `prisma migrate deploy`

### Шаг 6 — Скопировать данные с РФ → EU (SQLite)
- [ ] 6.1. Сделать свежий backup на РФ: `ssh app "cp prisma/data.db shared/backups/sqlite/data_pre_migration.db"`
- [ ] 6.2. `scp` файл с РФ на EU: `ssh app "cat prisma/data.db" | ssh amster_app "cat > /tmp/data_from_ru.db"`

### Шаг 7 — Написать и запустить скрипт миграции SQLite → PostgreSQL
- [ ] 7.1. Написать `scripts/migrate-sqlite-to-pg.ts`
- [ ] 7.2. Скрипт читает SQLite файл, пишет в PostgreSQL в правильном порядке:
  1. User
  2. Event
  3. UserEventAccess
  4. ContentPackage
  5. PackageItem
  6. UserPackageAccess
  7. ConferenceFile
  8. ClassFile
  9. StreamLink
  10. ClassStreamLink
  11. ChatMessage
- [ ] 7.3. Запустить скрипт на EU сервере
- [ ] 7.4. Сверить counts по каждой таблице

### Шаг 8 — Сравнение API-ответов EU vs РФ
- [ ] 8.1. Написать скрипт `scripts/compare-api.ts` — дёргает одинаковые эндпоинты на обоих серверах
- [ ] 8.2. Сравнить ответы:
  - `/api/conf-archive/list`
  - `/api/events/latest`
  - `/api/stream-link`
  - `/api/paid-content/packages` (с auth)
  - `/api/chat?limit=10`
- [ ] 8.3. Убедиться что структура и данные совпадают

### Шаг 9 — Если всё совпало: мигрировать РФ прод
- [ ] 9.1. Взять финальный backup SQLite на РФ
- [ ] 9.2. Поставить PostgreSQL на РФ сервер (ssh sw + apt install)
- [ ] 9.3. Запустить тот же скрипт миграции на РФ
- [ ] 9.4. Сменить DATABASE_URL в `.env` на РФ → `pm2 reload spokenword`
- [ ] 9.5. Smoke-тест прода
- [ ] 9.6. Если OK → всё готово. Если нет → откат за 1 минуту (вернуть старый `.env`)

### Шаг 10 — Rollback plan
- Откат EU: убрать `.env`, восстановить SQLite, перезапустить PM2
- Откат РФ (если дойдём): вернуть `DATABASE_URL=file:./data.db` в `.env` → `pm2 reload`
- Риск потери данных при откате: нулевой (SQLite файл нетронут, PostgreSQL — отдельно)

---

## Текущий статус серверов

| | РФ (155.212.174.133) | EU Amsterdam (185.200.178.73) |
|---|---|---|
| nginx | ✅ | ✅ |
| redis | ✅ | ✅ active |
| node / nvm | ✅ | ❌ нет |
| приложение | ✅ online | ❌ нет |
| PostgreSQL | ❌ нет | ❌ нет |
| SSL eu.spoken-word.ru | — | ❌ нет |

DNS `eu.spoken-word.ru` → 198.18.0.67 (проверить, должно быть 185.200.178.73)
