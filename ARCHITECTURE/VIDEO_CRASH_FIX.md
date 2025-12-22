# 🚨 ФИКС: Краш на больших файлах (301MB+)

**Статус:** Worker крашится на файлах 300MB+  
**Причина:** Недостаточно оптимизации FFmpeg  
**Решение:** Снижаем нагрузку FFmpeg

---

## 🎯 Что изменено:

### 1. FFmpeg настройки (более агрессивное сжатие):
```diff
- '-crf', '26'          → '-crf', '28'          (больше сжатие)
- '-preset', 'veryfast' → '-preset', 'ultrafast' (быстрее)
- '-b:a', '128k'        → '-b:a', '96k'         (меньше битрейт аудио)
- '-threads', '0'       → '-threads', '2'        (ограничили потоки)
+ '-bufsize', '512k'    (буфер)
+ '-maxrate', '2M'      (макс битрейт)
```

### 2. PM2 настройки:
```diff
- max_memory_restart: '6G' → max_memory_restart: '7G'
+ autorestart: true
+ max_restarts: 10
+ min_uptime: '10s'
```

---

## 🚀 КАК ПРИМЕНИТЬ:

### Способ 1: Через деплой (рекомендуемый)
```bash
# 1. Закоммить изменения
git add .
git commit -m "fix: оптимизация FFmpeg для больших файлов"
git push

# 2. Деплой
npm run deploy
```

### Способ 2: Ручной фикс на сервере
```bash
# 1. Загрузи изменённые файлы вручную
scp ecosystem.config.cjs amster_app:/home/appuser/apps/spokenword/source/
scp workers/video-compressor.ts amster_app:/home/appuser/apps/spokenword/source/workers/

# 2. Перезапусти worker
ssh amster_app "cd /home/appuser/apps/spokenword/source && pm2 restart video-worker"
```

### Способ 3: Через готовый скрипт
```bash
# На сервере запусти:
bash /home/appuser/apps/spokenword/source/SERVER_FIX_VIDEO_COMPRESSION.sh
```

---

## 🧪 ТЕСТИРОВАНИЕ:

### 1. Проверь что worker перезапустился:
```bash
ssh amster_app "pm2 list"
```

### 2. Очисти зависший файл из очереди:
```bash
ssh amster_app "redis-cli DEL 'upload:2:20251011191302_5df598.mp4'"
```

### 3. Загрузи файл снова:
- Открой админку
- Загрузи тот же файл 301MB
- Следи за логами:

```bash
ssh amster_app "pm2 logs video-worker --lines 0"
```

### 4. Смотри прогресс:
Должно быть:
```
🎬 Начинаем сжатие: 20251011191302_5df598.mp4
📊 Размер: 301MB
[ffmpeg логи...]
📉 Сжатие: 301MB → ~80MB
✅ Готово!
```

---

## 📊 ЧТО ОЖИДАТЬ:

| Размер входа | Время сжатия | Размер выхода | Память |
|--------------|--------------|---------------|--------|
| 8MB          | ~15 сек      | ~10MB         | 500MB  |
| 301MB        | ~5-8 мин     | ~80MB         | 2-3GB  |
| 500MB        | ~10-15 мин   | ~120MB        | 3-4GB  |
| 1GB+         | ~20-30 мин   | ~200MB        | 4-5GB  |

---

## ⚠️ ЕСЛИ ВСЁ РАВНО КРАШИТ:

### Вариант 1: Ещё сильнее упростить FFmpeg
```bash
ssh amster_app
cd /home/appuser/apps/spokenword/source
nano workers/video-compressor.ts
```

Измени на:
```typescript
const ffmpegArgs = [
  '-y',
  '-i', tempFilePath,
  '-vf', 'scale=854:480',      // 480p вместо 720p
  '-c:v', 'libx264',
  '-crf', '30',                 // ещё больше сжатие
  '-preset', 'ultrafast',
  '-c:a', 'aac',
  '-b:a', '64k',                // минимальное аудио
  '-movflags', '+faststart',
  '-threads', '1',              // один поток
  '-bufsize', '256k',
  '-maxrate', '1M',
  outputPath
]
```

### Вариант 2: Увеличить swap на сервере
```bash
ssh amster_app
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Вариант 3: Отказаться от сжатия больших файлов
В `upload/route.ts` добавь проверку:
```typescript
// Файлы больше 300MB не сжимаем
if (file.size > 300 * 1024 * 1024) {
  // Сохраняем как есть без сжатия
  return NextResponse.json({
    success: true,
    warning: 'Файл слишком большой, сохранён без сжатия'
  })
}
```

---

## 🔍 ОТЛАДКА:

### Посмотреть что произошло:
```bash
# Логи worker
ssh amster_app "pm2 logs video-worker --err --lines 100"

# Память на момент краша
ssh amster_app "dmesg | grep -i kill"

# Свободная память сейчас
ssh amster_app "free -h"
```

### Посмотреть очередь:
```bash
ssh amster_app "redis-cli LLEN bull:video-compression:wait"
ssh amster_app "redis-cli KEYS 'upload:*'"
```

### Очистить зависшие задачи:
```bash
ssh amster_app "redis-cli FLUSHDB"
```

---

## 🎯 ЛОКАЛЬНАЯ ПРОБЛЕМА:

> "локально не работает совсем"

### Проверь Redis локально:
```bash
# macOS
brew services start redis
redis-cli ping
```

Должен вернуть: `PONG`

### Запусти оба процесса:
```bash
# Терминал 1
npm run dev

# Терминал 2
npm run dev:worker
```

### Если Redis нет:
```bash
# Установи
brew install redis  # macOS
sudo apt install redis  # Ubuntu

# Запусти
brew services start redis  # macOS
sudo systemctl start redis  # Ubuntu
```

---

## ✅ ПОСЛЕ ФИКСА:

1. ✅ Закоммить изменения
2. ✅ Протестировать на 300MB файле
3. ✅ Мониторить память worker
4. ✅ Если работает - попробовать 500MB
5. ✅ Если крашит - пробуем Вариант 2 (swap) или Вариант 3 (без сжатия больших)

---

*Обновлено: 9 ноября 2025*  
*Оптимизация для 4 ядра / 8GB RAM сервера*

