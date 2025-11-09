# 🎥 Система сжатия видео (Redis + BullMQ)

## 🎯 Что изменилось

### ❌ Было (ПРОБЛЕМЫ):
- `exec()` буферизовал логи ffmpeg → утечка памяти
- Обработка в основном процессе Next.js → краш убивал весь сервер
- Статусы в Map → терялись при падении
- Файлы с ошибками считались загруженными

### ✅ Стало (РЕШЕНИЯ):
- `spawn()` без буферизации → память под контролем
- Отдельный worker процесс → краш worker не влияет на Next.js
- Статусы в Redis → не теряются
- Один файл за раз → `concurrency: 1`
- Файлы с ошибками можно перезагрузить

---

## 📦 Архитектура

```
┌─────────────────┐
│   Next.js API   │  (2GB RAM)
│  /api/upload    │
└────────┬────────┘
         │ добавляет в очередь
         ▼
    ┌────────┐
    │ Redis  │ ← статусы (pending/processing/done/error)
    └────┬───┘
         │ очередь BullMQ
         ▼
┌─────────────────┐
│  video-worker   │  (6GB RAM, concurrency: 1)
│  spawn(ffmpeg)  │  БЕЗ буферизации
└─────────────────┘
```

---

## 🚀 Запуск локально

### 1. Убедитесь что Redis запущен:
```bash
redis-cli ping
# Должен вернуть: PONG
```

### 2. Запустите Next.js:
```bash
npm run dev
```

### 3. В ОТДЕЛЬНОМ терминале запустите worker:
```bash
npm run dev:worker
```

### 4. Загрузите файл через админку:
- Откройте `/admin/packages`
- Создайте пакет
- Загрузите видео
- Смотрите логи в терминале worker

---

## 🏭 Запуск на продакшене

### 1. Деплой (обычный):
```bash
npm run deploy
```

### 2. PM2 автоматически запустит ОБА процесса:
- `spokenword` (Next.js) - порт 3005
- `video-worker` (обработчик)

### 3. Проверка статуса:
```bash
ssh amster_app "pm2 list"
```

Должно быть:
```
┌─────────────┬────┬─────────┬──────┐
│ name        │ id │ status  │ mem  │
├─────────────┼────┼─────────┼──────┤
│ spokenword  │ 0  │ online  │ 500M │
│ video-worker│ 1  │ online  │ 300M │
└─────────────┴────┴─────────┴──────┘
```

### 4. Логи worker:
```bash
ssh amster_app "pm2 logs video-worker"
```

---

## 🔍 Проверка очереди Redis

### Посмотреть очередь:
```bash
redis-cli
> KEYS bull:video-compression:*
> LLEN bull:video-compression:wait
> GET upload:1:filename.mp4
```

### Очистить очередь (если зависло):
```bash
redis-cli
> DEL bull:video-compression:wait
> DEL bull:video-compression:active
> KEYS upload:* | xargs redis-cli DEL
```

---

## 🐛 Отладка

### Worker не запускается:
```bash
# Проверьте Redis
redis-cli ping

# Проверьте логи
pm2 logs video-worker --lines 100
```

### Файл зависает в "processing":
```bash
# Посмотрите статус в Redis
redis-cli GET "upload:1:filename.mp4"

# Если статус "processing" но worker не работает - очистите:
redis-cli SET "upload:1:filename.mp4" '{"status":"error","error":"manual reset"}'
```

### Краш worker:
- Worker автоматически перезапустится (PM2)
- Задачи в очереди НЕ пропадут
- После перезапуска worker продолжит обработку

---

## 📊 Мониторинг

### Память:
```bash
ssh amster_app "pm2 monit"
```

### Задачи в очереди:
```bash
redis-cli LLEN bull:video-compression:wait
redis-cli LLEN bull:video-compression:active
```

### Статусы файлов:
```bash
redis-cli KEYS "upload:*"
```

---

## ⚙️ Настройки

### Изменить concurrency (количество одновременных задач):
В `workers/video-compressor.ts`:
```typescript
concurrency: 1  // <- меняйте осторожно!
```

### Изменить память worker:
В `ecosystem.config.cjs`:
```javascript
max_memory_restart: '6G'  // <- увеличьте если нужно
```

### Изменить Redis:
В `.env`:
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## ✅ Преимущества новой системы

1. **Надёжность** - worker крашнется → очередь цела
2. **Память** - spawn не буферизует → нет утечек
3. **Контроль** - один файл за раз → предсказуемо
4. **Статусы** - Redis не теряет данные
5. **Повторы** - файлы с ошибками можно перезагрузить
6. **Масштабируемость** - легко добавить больше worker

---

## 📝 Созданные файлы

- `lib/redis.ts` - подключение к Redis
- `lib/videoQueue.ts` - очередь BullMQ
- `workers/video-compressor.ts` - обработчик (spawn ffmpeg)
- `app/api/admin/packages/upload/route.ts` - упрощён
- `ecosystem.config.cjs` - добавлен video-worker

---

## 🆘 Экстренное восстановление

Если всё сломалось:

1. **Остановить worker:**
```bash
ssh amster_app "pm2 stop video-worker"
```

2. **Очистить очередь:**
```bash
redis-cli FLUSHDB
```

3. **Перезапустить всё:**
```bash
ssh amster_app "pm2 restart all"
```

4. **Проверить логи:**
```bash
ssh amster_app "pm2 logs --lines 50"
```

---

*Создано: 9 ноября 2025*  
*Система: BullMQ + Redis + spawn(ffmpeg)*

