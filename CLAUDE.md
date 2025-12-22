# spokenword — CLAUDE

## Кратко
Next.js приложение с очередями BullMQ для фонового сжатия видео через FFmpeg. Приложение и worker работают как отдельные процессы, управляются PM2.

## Цели и стек
- MVP-фокус, без лишних слоёв.
- Next.js 16 (App Router) + React 19 + TypeScript strict.
- Tailwind/shadcn/ui для UI.
- Prisma + SQLite, Redis (ioredis), BullMQ.
- FFmpeg/FFprobe для обработки видео.

## Важные директории
- `app/` — Next.js страницы и API.
- `components/` — UI-компоненты.
- `lib/` — Prisma, Redis, очередь видео.
- `workers/` — фоновые воркеры (`video-worker.ts` — entrypoint).
- `scripts/` — вспомогательные скрипты деплоя/поддержки.
- `prisma/` — схема, миграции, данные.

## Правила кодовой базы
- Только функциональные компоненты, без классов и сервис-слоёв.
- Деструктурировать пропсы inline.
- Логика без сайд-эффектов при импорте; воркеры запускаются через явные entrypoints.
- Ориентир на production: graceful shutdown, предсказуемые команды запуска.
- Настройки окружения через `.env`/`.env.production`.

## Архитектура запуска
- Web: `spokenword` — `next start -p 3005` (PM2).
- Worker: `spokenword-video-worker` — `workers/video-worker.ts` (BullMQ очередь `video-compression`, FFmpeg).
- Оба процесса описаны в `ecosystem.config.cjs`; могут работать локально (`npm run dev`, `npm run worker`) и под PM2 (`pm2 startOrReload ecosystem.config.cjs`).

## Нейминг/договорённости
- Очередь сжатия: `video-compression`.
- Временные файлы очищаются внутри job-обработчика.
- Логи воркера и приложения разделены в PM2 (`spokenword` / `spokenword-video-worker`).


