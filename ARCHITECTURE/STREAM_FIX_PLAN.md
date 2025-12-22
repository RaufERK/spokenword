# 🔧 План исправления стриминга

**Дата:** 2025-10-04  
**Проблема:** Постоянные срывы и перезагрузки стрима  
**Статус:** 🔴 Требует исправления

---

## 🔍 ДИАГНОСТИКА (что нашли)

### Основная проблема:
❌ **SRS постоянно падает из-за ошибок FFmpeg транскодинга**

```
ERROR: Open log file failed for FFmpeg
./objs/ffmpeg-encoder-__defaultVhost__-live-main-low360.log failed
process pid=40966 terminate, please restart it
```

### Причина:
- SRS запускает FFmpeg для транскодинга 1280x720 → 360p
- FFmpeg пытается писать логи в `/opt/srs/objs/`
- **Нет прав на запись** → FFmpeg падает → SRS перезапускается → стрим рвется

### Последствия:
- 🔴 Срывы каждые 3-10 секунд
- 🔴 Сегменты начинаются заново (main-0.ts, main-1.ts)
- 🔴 Пользователи видят черный экран и ошибки

---

## 📋 ПЛАН ИСПРАВЛЕНИЯ

### Этап 1: Исправление прав доступа (КРИТИЧНО) 🔧

**Цель:** Дать SRS и FFmpeg права на запись логов и HLS файлов

**Действия:**

1. **Создать папки с правильными правами:**
```bash
# Папка для логов FFmpeg
sudo mkdir -p /opt/srs/objs
sudo chown -R srs:srs /opt/srs/objs
sudo chmod 755 /opt/srs/objs

# Папка для HLS сегментов
sudo mkdir -p /var/lib/srs/hls/live
sudo chown -R srs:srs /var/lib/srs/hls
sudo chmod 755 /var/lib/srs/hls
```

2. **Проверить пользователя SRS:**
```bash
ps aux | grep srs
# Должно быть: srs (не root)
```

3. **Если SRS работает от root - исправить systemd unit:**
```bash
sudo systemctl edit srs
# Добавить:
[Service]
User=srs
Group=srs
```

---

### Этап 2: Включить транскодинг 360p 📹

**Цель:** Транскодировать 1280x720 (из OBS) в 640x360 для стабильного стрима

**Действия:**

1. **Сделать бэкап конфига:**
```bash
sudo cp /etc/srs/srs.conf /etc/srs/srs.conf.backup-$(date +%Y%m%d-%H%M%S)
```

2. **Включить транскодинг:**
```bash
sudo nano /etc/srs/srs.conf
```

Найти:
```conf
transcode {
    enabled     off;   # ← Изменить на: on
```

3. **Проверить настройки транскодинга:**
```conf
engine low360 {
    enabled         on;
    vcodec          libx264;
    vprofile        baseline;
    vpreset         veryfast;
    vbitrate        700;        # 700 kbps
    vwidth          640;        # 360p
    vheight         360;
    acodec          aac;
    abitrate        96;
    asample_rate    44100;
    achannels       2;
    output          rtmp://127.0.0.1:[port]/[app]/[stream]_360?vhost=[vhost];
}
```

4. **Изменить HLS на использование транскодированного потока:**
```conf
hls {
    enabled         on;
    hls_path        /var/lib/srs/hls;
    hls_fragment    2;
    hls_window      6;
    hls_cleanup     on;
    hls_dispose     3;
    hls_wait_keyframe on;
}

# Добавить если нет:
play {
    gop_cache   on;
}
```

5. **Перезапустить SRS:**
```bash
sudo systemctl restart srs
```

---

### Этап 3: Создать скрипт npm run fix 🛠️

**Цель:** Автоматически исправлять права после деплоя и при проблемах

**Действия:**

1. **Создать скрипт `scripts/fix-permissions.sh`:**
```bash
#!/bin/bash
set -e

echo "🔧 Fixing SRS permissions..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}→ Fixing /opt/srs/objs permissions...${NC}"
sudo mkdir -p /opt/srs/objs
sudo chown -R srs:srs /opt/srs/objs
sudo chmod 755 /opt/srs/objs

echo -e "${YELLOW}→ Fixing /var/lib/srs/hls permissions...${NC}"
sudo mkdir -p /var/lib/srs/hls/live
sudo chown -R srs:srs /var/lib/srs/hls
sudo chmod 755 /var/lib/srs/hls

echo -e "${YELLOW}→ Cleaning old segments...${NC}"
sudo rm -f /var/lib/srs/hls/live/*.tmp

echo -e "${YELLOW}→ Checking SRS status...${NC}"
sudo systemctl status srs --no-pager -l | head -15

echo -e "${GREEN}✅ Permissions fixed!${NC}"
echo ""
echo "Current state:"
ls -lah /var/lib/srs/hls/live/ | tail -10
```

2. **Сделать скрипт исполняемым:**
```bash
chmod +x scripts/fix-permissions.sh
```

3. **Добавить в package.json:**
```json
"scripts": {
  "fix": "ssh amster 'bash -s' < scripts/fix-permissions.sh",
  "fix:local": "./scripts/fix-permissions.sh"
}
```

4. **Протестировать:**
```bash
npm run fix
```

---

### Этап 4: Настроить подробное логирование 📝

**Цель:** Видеть всю картину работы стрима в реальном времени

**Действия:**

1. **Создать скрипт мониторинга `scripts/monitor-stream.sh`:**
```bash
#!/bin/bash

echo "📊 Stream Monitoring Dashboard"
echo "================================"
echo ""

while true; do
  clear
  echo "📊 STREAM MONITORING - $(date '+%H:%M:%S')"
  echo "========================================"
  echo ""
  
  # SRS статус
  echo "🔴 SRS Status:"
  systemctl is-active srs && echo "  ✅ Running" || echo "  ❌ Stopped"
  echo ""
  
  # CPU и Memory
  echo "💻 Resources:"
  ps aux | grep srs | grep -v grep | awk '{printf "  CPU: %s%%  MEM: %s%%  PID: %s\n", $3, $4, $2}'
  echo ""
  
  # HLS сегменты
  echo "📹 HLS Segments:"
  ls -lh /var/lib/srs/hls/live/*.ts 2>/dev/null | tail -5 | awk '{printf "  %s  %s\n", $9, $5}'
  echo "  Total: $(ls /var/lib/srs/hls/live/*.ts 2>/dev/null | wc -l) segments"
  echo ""
  
  # Плейлист
  echo "📄 Playlist:"
  if [ -f /var/lib/srs/hls/live/main.m3u8 ]; then
    SEGMENTS=$(grep -c "\.ts" /var/lib/srs/hls/live/main.m3u8)
    echo "  Segments in playlist: $SEGMENTS"
  else
    echo "  ❌ No playlist found"
  fi
  echo ""
  
  # Последние логи SRS
  echo "📋 Recent SRS logs:"
  journalctl -u srs -n 3 --no-pager | tail -3
  echo ""
  echo "Press Ctrl+C to exit"
  
  sleep 2
done
```

2. **Сделать исполняемым:**
```bash
chmod +x scripts/monitor-stream.sh
```

3. **Добавить в package.json:**
```json
"scripts": {
  "monitor": "ssh amster 'bash -s' < scripts/monitor-stream.sh",
  "logs": "ssh amster 'sudo journalctl -u srs -f'",
  "logs:nginx": "ssh amster 'sudo tail -f /var/log/nginx/spoken_word_access.log'"
}
```

4. **Использование:**
```bash
# Мониторинг в реальном времени
npm run monitor

# Логи SRS
npm run logs

# Логи nginx
npm run logs:nginx
```

---

### Этап 5: Тестирование со стримом 🧪

**Цель:** Проверить что все работает стабильно

**Подготовка:**

1. **Запустить мониторинг (в отдельном терминале):**
```bash
npm run monitor
```

2. **Запустить логи SRS (в другом терминале):**
```bash
npm run logs
```

3. **Открыть страницу стрима:**
```
https://spoken-word.ru/live
```

4. **Открыть DevTools Console (F12)**

**Тестирование:**

1. **Запустить стрим в OBS:**
   - Сервер: `rtmp://stream.spoken-word.ru/live`
   - Ключ: `main`

2. **Наблюдать в мониторинге:**
   - ✅ SRS должен быть Running
   - ✅ CPU 3-5% (с транскодингом)
   - ✅ Сегменты должны расти: main-0.ts, main-1.ts, main-2.ts...
   - ✅ В плейлисте 4-6 сегментов постоянно

3. **Проверить логи SRS:**
   - ✅ Должно быть: `start publish`
   - ✅ Должно быть: `-> HLS time=...`
   - ✅ НЕ должно быть: `process terminate`
   - ✅ НЕ должно быть: `Open log file failed`

4. **Проверить браузер:**
   - ✅ Видео загружается
   - ✅ Нет черных экранов
   - ✅ Нет ошибок 404 в Network tab
   - ✅ В Console логи показывают стабильность

5. **Тест на 5 минут:**
   - Оставить стрим идти 5 минут
   - Наблюдать за CPU/памятью
   - Проверить что нет перезапусков
   - Проверить что сегменты не начинаются заново

**Критерии успеха:**
- [ ] Стрим идет без срывов 5 минут
- [ ] Сегменты растут последовательно (не перезапускаются)
- [ ] CPU стабильно 3-5%
- [ ] Память не растет (утечек нет)
- [ ] Нет ошибок в логах SRS
- [ ] Нет ошибок в браузере

---

### Этап 6: Упрощение фронтенда (опционально) 🎨

**Цель:** Убрать лишнюю сложность если сервер работает стабильно

**Если тесты прошли успешно, можем упростить:**

1. **Убрать warm-up период (6 сек задержка):**
   - Показывать плеер сразу как `isLive: true`
   - Убрать `isWarmingUp` состояние
   - Убрать таймеры на 5-6 секунд

2. **Упростить retry логику:**
   - Вернуть 3 попытки вместо 8/10
   - Убрать проверку "молодого" стрима
   - Стандартные задержки между попытками

3. **Оставить полезное:**
   - ✅ API с информацией о сегментах (для диагностики)
   - ✅ Логирование в консоль (для отладки)
   - ✅ Cache-busting для плейлиста

**Упрощенная версия HlsPlayer:**
```typescript
// Простой плеер без warm-up и сложного retry
// Загружается сразу когда isLive: true
// 3 попытки переподключения
// Детальные логи
```

---

## 🎯 ЧЕКЛИСТ ПРИ ВОЗВРАЩЕНИИ

Когда вернетесь - выполнить по порядку:

### ☐ Шаг 1: Исправить права (5 минут)
```bash
ssh amster
sudo mkdir -p /opt/srs/objs /var/lib/srs/hls/live
sudo chown -R srs:srs /opt/srs/objs /var/lib/srs/hls
sudo chmod 755 /opt/srs/objs /var/lib/srs/hls
```

### ☐ Шаг 2: Проверить пользователя SRS
```bash
ps aux | grep srs
# Если root - нужно изменить systemd unit
```

### ☐ Шаг 3: Включить транскодинг
```bash
sudo nano /etc/srs/srs.conf
# enabled off → enabled on
sudo systemctl restart srs
```

### ☐ Шаг 4: Создать скрипты
```bash
# Создать scripts/fix-permissions.sh
# Создать scripts/monitor-stream.sh
chmod +x scripts/*.sh
```

### ☐ Шаг 5: Протестировать
```bash
npm run fix
npm run monitor  # в отдельном терминале
# Включить стрим в OBS
# Наблюдать 5 минут
```

### ☐ Шаг 6: Решить по фронту
- Если стабильно → упростить фронт
- Если проблемы → смотреть логи вместе

---

## 📚 ПОЛЕЗНЫЕ КОМАНДЫ

### Диагностика:
```bash
# Проверить статус SRS
ssh amster 'sudo systemctl status srs'

# Посмотреть логи SRS
ssh amster 'sudo journalctl -u srs -n 50'

# Посмотреть сегменты HLS
ssh amster 'ls -lah /var/lib/srs/hls/live/'

# Проверить права
ssh amster 'ls -la /opt/srs/objs/'

# Проверить плейлист
ssh amster 'cat /var/lib/srs/hls/live/main.m3u8'

# API статус
curl "https://spoken-word.ru/api/stream-status?key=main" | jq .
```

### Исправление:
```bash
# Исправить права
npm run fix

# Перезапустить SRS
ssh amster 'sudo systemctl restart srs'

# Очистить старые сегменты
ssh amster 'sudo rm -f /var/lib/srs/hls/live/*.ts /var/lib/srs/hls/live/*.tmp'

# Проверить конфиг SRS
ssh amster 'cat /etc/srs/srs.conf | grep -A 20 transcode'
```

### Мониторинг:
```bash
# Dashboard
npm run monitor

# Логи в реальном времени
npm run logs

# Логи nginx
npm run logs:nginx

# CPU и память
ssh amster 'top -bn1 | grep srs'
```

---

## 🚨 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### Проблема: SRS не запускается
```bash
sudo journalctl -u srs -n 100
# Смотреть на ошибки конфигурации
```

### Проблема: Сегменты не создаются
```bash
# Проверить права
ls -la /var/lib/srs/hls/live/
sudo chown -R srs:srs /var/lib/srs/hls
```

### Проблема: FFmpeg падает
```bash
# Проверить логи FFmpeg
sudo ls -la /opt/srs/objs/
sudo cat /opt/srs/objs/ffmpeg-encoder-*.log
```

### Проблема: Стрим не показывается
```bash
# Проверить nginx
curl -I https://spoken-word.ru/hls/live/main.m3u8
# Должно быть 200 OK
```

---

## 📞 СВЯЗЬ

Когда вернетесь - пишите "Вернулся, начинаем" и я помогу пройти все шаги! 🚀

**Успехов! Всё получится!** 💪

