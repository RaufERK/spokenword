# 🚀 ДЕПЛОЙ ФИКСА СЖАТИЯ ВИДЕО

## ✅ ЧТО БЫЛО СДЕЛАНО:

1. **Оптимизированы настройки FFmpeg:**
   - `crf 28` (было 26) - больше сжатие
   - `ultrafast` (было veryfast) - быстрее обработка
   - `threads 2` (было 0) - ограничили потоки
   - Добавлены `bufsize` и `maxrate` для контроля памяти

2. **Увеличена память worker:**
   - `7GB` (было 6GB)
   - Добавлен `autorestart`

3. **Документация:**
   - `VIDEO_CRASH_FIX.md` - инструкции по фиксу
   - `SERVER_FIX_VIDEO_COMPRESSION.sh` - скрипт для сервера

---

## 🚀 ДЕПЛОЙ (ВЫБЕРИ ОДИН СПОСОБ):

### Способ 1: Полный деплой (рекомендуемый)
```bash
npm run deploy
```

### Способ 2: Быстрая команда
```bash
ssh amster_app "cd /home/appuser/apps/spokenword && git pull && pm2 restart video-worker"
```

### Способ 3: Пошаговый (если нужен контроль)
```bash
# 1. Подключаемся
ssh amster_app

# 2. Идём в проект
cd /home/appuser/apps/spokenword/source

# 3. Пуллим изменения
git pull

# 4. Перезапускаем worker
pm2 restart video-worker

# 5. Смотрим статус
pm2 list

# 6. Смотрим логи
pm2 logs video-worker --lines 20
```

---

## 🧪 ТЕСТ ПОСЛЕ ДЕПЛОЯ:

### 1. Проверь процессы:
```bash
ssh amster_app "pm2 list"
```

Должно быть:
```
┌─────────────┬────┬─────────┐
│ name        │ id │ status  │
├─────────────┼────┼─────────┤
│ spokenword  │ 8  │ online  │
│ video-worker│ 9  │ online  │
└─────────────┴────┴─────────┘
```

### 2. Очисти зависший файл:
```bash
ssh amster_app "redis-cli DEL 'upload:2:20251011191302_5df598.mp4'"
```

### 3. Очисти temp:
```bash
ssh amster_app "rm -f /home/appuser/apps/spokenword/source/paid-content/temp/*"
```

### 4. Загрузи файл снова:
- Открой: https://spokenword.ru/admin/packages
- Загрузи файл 301MB
- Следи за логами:

```bash
ssh amster_app "pm2 logs video-worker --lines 0"
```

Должно быть:
```
🎬 Начинаем сжатие: 20251011191302_5df598.mp4
📊 Размер: 301MB
[... прогресс ffmpeg ...]
📉 Сжатие: 301MB → ~80MB
🎯 Коэффициент: 73%
✅ Готово: 20251011191302_5df598.mp4
```

---

## 📊 МОНИТОРИНГ:

### Память:
```bash
ssh amster_app "pm2 monit"
```

Нажми `q` для выхода.

### Очередь Redis:
```bash
ssh amster_app "redis-cli LLEN bull:video-compression:wait"
ssh amster_app "redis-cli LLEN bull:video-compression:active"
```

### Логи в реальном времени:
```bash
ssh amster_app "pm2 logs video-worker --lines 0"
```

---

## 🆘 ЕСЛИ ВСЁ РАВНО КРАШИТ:

### 1. Посмотри ошибку:
```bash
ssh amster_app "pm2 logs video-worker --err --lines 50"
```

### 2. Проверь память:
```bash
ssh amster_app "free -h"
ssh amster_app "dmesg | tail -20"
```

### 3. Если OOM (Out of Memory):
```bash
# Создай swap файл (4GB)
ssh amster_app
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
sudo swapon --show
```

### 4. Или ещё сильнее упрости FFmpeg:
```bash
ssh amster_app
nano /home/appuser/apps/spokenword/source/workers/video-compressor.ts
```

Измени на 480p:
```typescript
'-vf', 'scale=854:480',  // вместо 1280:720
'-crf', '30',             // вместо 28
'-threads', '1',          // вместо 2
```

Сохрани (Ctrl+O, Enter, Ctrl+X) и перезапусти:
```bash
pm2 restart video-worker
```

---

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

| Размер | Время    | Память | Результат |
|--------|----------|--------|-----------|
| 8MB    | ~15 сек  | 500MB  | ✅ ~10MB  |
| 301MB  | ~5-8 мин | 2-3GB  | ✅ ~80MB  |
| 500MB  | ~10 мин  | 3-4GB  | ✅ ~120MB |

---

## 🎯 БЫСТРЫЕ КОМАНДЫ:

```bash
# Деплой
npm run deploy

# Статус
ssh amster_app "pm2 list"

# Логи
ssh amster_app "pm2 logs video-worker"

# Очистить temp
ssh amster_app "rm -f /home/appuser/apps/spokenword/source/paid-content/temp/*"

# Очистить Redis
ssh amster_app "redis-cli FLUSHDB"

# Перезапуск worker
ssh amster_app "pm2 restart video-worker"

# Память
ssh amster_app "free -h"
```

---

**ГОТОВО! Попробуй загрузить файл снова!** 🚀

Если крашит - пиши, будем дальше оптимизировать! 💪

