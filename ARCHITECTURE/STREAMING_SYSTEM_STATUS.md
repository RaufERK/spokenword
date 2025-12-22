# 🎬 Статус системы стриминга

## ✅ Текущий статус: PRODUCTION READY

**Дата последнего обновления:** 2025-10-03 16:00  
**Версия системы:** SRS-only (v2.0)  
**Статус:** 🟢 Работает стабильно

---

## 🏗️ Архитектура системы

### Схема потоков данных:

```
┌─────────────────────────────────────────────────────────────┐
│                         OBS Studio                          │
│            (Стриминг с камеры/экрана)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ RTMP (H.264 + AAC)
                            │ rtmp://stream.spoken-word.ru/live/main
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SRS (Simple Realtime Server)             │
│                                                             │
│  • Принимает RTMP поток                                    │
│  • Транскодирует в 360p (H.264 baseline + AAC 96kbps)     │
│  • Генерирует HLS сегменты (2 сек каждый)                 │
│  • Автоматически очищает старые сегменты                   │
│                                                             │
│  Выход: /var/lib/srs/hls/live/main.m3u8                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HLS (HTTP Live Streaming)
                            │ HTTPS
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    nginx (1.28.0 stable)                    │
│                                                             │
│  • Раздаёт HLS через HTTPS                                 │
│  • Проксирует Next.js приложение                           │
│  • CORS headers для кросс-доменных запросов                │
│                                                             │
│  Location: /hls/ → /var/lib/srs/hls/                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ↓                       ↓
┌─────────────────────┐   ┌─────────────────────┐
│  /live (видео)      │   │  /audio (аудио)     │
│                     │   │                     │
│  HlsPlayer.tsx      │   │  AudioHlsPlayer.tsx │
│  (hls.js + native)  │   │  (hls.js + native)  │
└─────────────────────┘   └─────────────────────┘
          │                         │
          │                         │
          └─────────┬───────────────┘
                    │
                    ↓
            Пользователи
    (Desktop: Chrome, Firefox, Safari)
    (Mobile: iOS Safari, Android Chrome)
```

---

## 🎯 Компоненты системы

### 1. SRS (Simple Realtime Server)
**Версия:** 6.0.177  
**Статус:** ✅ Running  
**PID:** 2289  
**CPU:** ~2-3% при стриме  
**Memory:** ~380 MB  

**Конфигурация:**
```
Порты:
  - RTMP: 1935/tcp (OBS → SRS)
  - HTTP API: 127.0.0.1:1985 (внутренний)
  - WebRTC: 8000/udp (готов к использованию)

HLS настройки:
  - hls_fragment: 2 сек
  - hls_window: 6 сегментов (12 сек буфер)
  - hls_cleanup: on (автоматическая очистка)
  - hls_dispose: 3 сек (удаление после disconnect)
  - hls_wait_keyframe: on (чистый старт)

Транскодинг:
  - Engine: low360
  - Разрешение: 640x360
  - Видео: H.264 baseline, 700 kbps, 30 fps
  - Аудио: AAC, 96 kbps, 44.1 kHz, stereo
  - Preset: veryfast (баланс скорость/качество)

Директории:
  - Конфиг: /etc/srs/srs.conf
  - HLS путь: /var/lib/srs/hls/
  - PID файл: /var/run/srs.pid
```

---

### 2. nginx
**Версия:** 1.28.0 (stable)  
**Статус:** ✅ Running  

**Конфигурация:**
```nginx
# HLS раздача
location /hls/ {
    alias /var/lib/srs/hls/;
    
    # Заголовки для live-стриминга (no-cache)
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    
    # CORS для кросс-доменных запросов
    add_header Access-Control-Allow-Origin "*";
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    
    # MIME типы
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }
}

# Next.js приложение
location / {
    proxy_pass http://127.0.0.1:3005;
    # ... proxy headers
}
```

**Файлы:**
- Конфиг сайта: `/etc/nginx/sites-enabled/spoken-word.ru`
- Бэкап: `/etc/nginx/sites-enabled/spoken-word.ru.backup-20251003-164543`

---

### 3. Next.js приложение
**Версия:** 15.3.1  
**Статус:** ✅ Running (PM2)  
**PID:** 3240  
**Порт:** 3005  

**Страницы:**
- `/live` - Видео трансляция (HlsPlayer)
- `/audio` - Аудио трансляция (AudioHlsPlayer)

**URL потока:**
```
https://spoken-word.ru/hls/live/main.m3u8
```

**API:**
- `/api/stream-status?key=main` - проверка статуса стрима

---

## 📊 Параметры качества и задержки

### Видео (360p):
- Разрешение: 640x360
- Битрейт: 700 kbps
- FPS: 30
- Кодек: H.264 (baseline)

### Аудио:
- Битрейт: 96 kbps
- Sample rate: 44.1 kHz
- Каналы: Stereo
- Кодек: AAC

### Задержка (latency):
- **HLS:** ~10-15 секунд (от камеры до экрана пользователя)
  - OBS → SRS: ~1 сек
  - SRS буфер: ~6 сек (3 сегмента)
  - Сеть + браузер: ~3-5 сек

### Совместимость:
- ✅ Desktop: Chrome, Firefox, Safari, Edge (все современные)
- ✅ Mobile: iOS Safari 13+, Android Chrome 80+
- ✅ Safari: Нативная поддержка HLS
- ✅ Остальные: hls.js (MediaSource Extensions)

---

## 🔧 Команды управления

### SRS:
```bash
# Статус
sudo systemctl status srs

# Перезапуск
sudo systemctl restart srs

# Логи
sudo journalctl -u srs -f

# Проверка HLS генерации
ls -lah /var/lib/srs/hls/live/
cat /var/lib/srs/hls/live/main.m3u8

# API статус
curl http://127.0.0.1:1985/api/v1/streams/
```

### nginx:
```bash
# Проверка конфига
sudo nginx -t

# Перезагрузка
sudo systemctl reload nginx

# Статус
sudo systemctl status nginx

# Логи
sudo tail -f /var/log/nginx/spoken_word_access.log
sudo tail -f /var/log/nginx/spoken_word_error.log
```

### Next.js (PM2):
```bash
# Статус
sudo -u appuser bash -c 'export PATH=/home/appuser/.nvm/versions/node/v22.18.0/bin:$PATH && pm2 list'

# Перезапуск
sudo -u appuser bash -c 'export PATH=/home/appuser/.nvm/versions/node/v22.18.0/bin:$PATH && pm2 restart spokenword'

# Логи
sudo -u appuser bash -c 'export PATH=/home/appuser/.nvm/versions/node/v22.18.0/bin:$PATH && pm2 logs spokenword'
```

### Проверка потока:
```bash
# Через curl
curl -I https://spoken-word.ru/hls/live/main.m3u8

# Через ffprobe
ffprobe https://spoken-word.ru/hls/live/main.m3u8

# CPU и память
top -bn1 | grep srs
ps aux | grep srs
```

---

## 🎯 OBS настройки

### Настройки стрима:
```
Сервер: rtmp://stream.spoken-word.ru/live
Ключ потока: main
```

### Рекомендуемые параметры OBS:
```
Видео:
  - Разрешение вывода: 1920x1080 (или ваше)
  - FPS: 30
  - Битрейт: 2500-3000 kbps (SRS сам транскодирует в 700)
  - Кодек: H.264
  - Preset: veryfast или faster
  - Profile: main или high
  - Keyframe interval: 2 секунды

Аудио:
  - Битрейт: 128-160 kbps
  - Sample rate: 44.1 или 48 kHz
  - Формат: AAC
```

---

## ✅ Решённые проблемы

### До миграции:
1. ❌ **Дубликаты ffmpeg процессов** - два процесса писали в одну директорию
2. ❌ **Старые сегменты не удалялись** - при перезапуске стрима оставались ghost segments
3. ❌ **Проблемы на мобильных** - "ошибка загрузки видео", нужна перезагрузка страницы
4. ❌ **Высокая нагрузка CPU** - ~60% при стриме (3 процесса)
5. ❌ **Конфликт сегментов** - неправильная нумерация, кэш проблемы

### После миграции:
1. ✅ **Один процесс (SRS)** - чистая архитектура
2. ✅ **Автоматическая очистка** - `hls_cleanup=on`, `hls_dispose=3`
3. ✅ **Стабильная работа** - правильные cache-busting, retry логика
4. ✅ **Низкая нагрузка** - ~2-3% CPU (в 20 раз меньше!)
5. ✅ **Чистые сегменты** - начинаются с 0 при каждом стриме

---

## 📈 Производительность

### CPU нагрузка:
```
Без стрима:
  SRS: ~1% CPU, ~40 MB RAM

Во время стрима:
  SRS: ~2-3% CPU, ~380 MB RAM
  
Сравнение:
  Было (SRS + 2x ffmpeg): ~60% CPU
  Стало (только SRS): ~2-3% CPU
  Выигрыш: в 20 раз меньше нагрузка!
```

### Сеть:
```
Входящий трафик (OBS → SRS):
  ~2.5 Mbps (2500 kbps видео + 128 kbps аудио)

Исходящий трафик (пользователям):
  ~700 kbps на пользователя (360p)
  
Пример: 100 зрителей = ~70 Mbps исходящий
```

### Диск:
```
HLS сегменты:
  ~600-700 KB на сегмент (2 сек)
  6 сегментов в окне = ~4 MB активных
  Автоматическая очистка старых
```

---

## 🔒 Безопасность

### Текущее состояние:
- ✅ HTTPS для всего контента
- ✅ CORS настроен правильно
- ⚠️ RTMP без аутентификации (stream key = "main" известен)

### Рекомендации для будущего:
1. **Защита RTMP:**
   ```conf
   # В SRS конфиге
   vhost __defaultVhost__ {
       http_hooks {
           enabled         on;
           on_publish      http://127.0.0.1:3005/api/rtmp-auth;
       }
   }
   ```
   
2. **Rate limiting для HLS:**
   ```nginx
   limit_req_zone $binary_remote_addr zone=hls:10m rate=30r/s;
   
   location /hls/ {
       limit_req zone=hls burst=50 nodelay;
       # ...
   }
   ```

3. **Мониторинг:** Настроить alerting для uptime

---

## 🚀 Будущие улучшения

### В ближайшее время:
- [ ] Упрощение дизайна `/audio` страницы (по запросу)
- [ ] Очистка старых скриптов `/usr/local/bin/start-hls-*.sh`
- [ ] Удаление старых systemd юнитов

### В перспективе:
- [ ] **WebRTC (WHEP)** для низкой задержки (<1 сек)
  - Уже настроено в SRS (порт 8000/udp открыт)
  - Нужно добавить nginx прокси для `/rtc/`
  
- [ ] **Форварды на YouTube/RuTube:**
  ```conf
  vhost __defaultVhost__ {
      forward {
          enabled on;
          destination rtmp://a.rtmp.youtube.com/live2/YOUR_KEY;
          destination rtmp://stream.rutube.ru/app/YOUR_KEY;
      }
  }
  ```

- [ ] **Adaptive bitrate (ABR):**
  - Добавить профили 240p, 480p, 720p
  - Автоматическое переключение по скорости сети

- [ ] **DVR (запись в архив):**
  - Автоматическая запись стримов
  - Плейлист прошедших трансляций

---

## 📞 Диагностика проблем

### Проблема: Стрим не запускается
```bash
# 1. Проверить SRS
sudo systemctl status srs
sudo journalctl -u srs -n 50

# 2. Проверить порт RTMP
sudo netstat -tlnp | grep 1935

# 3. Проверить firewall
sudo ufw status | grep 1935
```

### Проблема: Видео не загружается
```bash
# 1. Проверить генерацию HLS
ls -lah /var/lib/srs/hls/live/
cat /var/lib/srs/hls/live/main.m3u8

# 2. Проверить nginx
sudo nginx -t
curl -I https://spoken-word.ru/hls/live/main.m3u8

# 3. Проверить права доступа
ls -la /var/lib/srs/hls/
```

### Проблема: Старые сегменты не удаляются
```bash
# Проверить конфиг SRS
grep -A 5 'hls {' /etc/srs/srs.conf
# Должно быть: hls_cleanup on, hls_dispose 3

# Перезапустить SRS
sudo systemctl restart srs
```

### Проблема: Высокая нагрузка CPU
```bash
# Проверить процессы
ps aux | grep -E 'srs|ffmpeg' | grep -v grep

# Если есть ffmpeg - убить
sudo pkill -f ffmpeg

# Проверить транскодинг в SRS
curl http://127.0.0.1:1985/api/v1/streams/
```

---

## 📚 Документация

### Внутренние документы:
- `SRS_MIGRATION.md` - Начальный план миграции
- `SRS_MIGRATION_PROGRESS.md` - История миграции
- `SRS_MIGRATION_PLAN.md` - Детальный план
- `SRS_MIGRATION_PLAN_2.md` - Финальные детали
- `SRS_ONLY_MIGRATION.md` - План текущей миграции
- `AUDIO_HLS_MIGRATION.md` - Миграция аудио на HLS
- `ICECAST_VS_HLS.md` - Сравнение подходов
- `STREAMING_SYSTEM_STATUS.md` - Этот документ

### Внешняя документация:
- SRS: https://ossrs.io/
- nginx: https://nginx.org/
- HLS.js: https://github.com/video-dev/hls.js

---

## 🎉 Итоговые метрики

### Надёжность:
- ✅ Один процесс = меньше точек отказа
- ✅ Автоматическая очистка = нет ghost segments
- ✅ Стабильная работа на мобильных
- ✅ Автоматическое переподключение в плеере

### Производительность:
- ✅ CPU: 60% → 2-3% (в 20 раз меньше!)
- ✅ Простота эксплуатации: 3 процесса → 1 процесс
- ✅ Задержка: ~10-15 сек (приемлемо для HLS)

### Масштабируемость:
- ✅ Готово к добавлению WebRTC (низкая задержка)
- ✅ Готово к форвардам (YouTube, RuTube)
- ✅ Готово к ABR (несколько качеств)

---

**Система готова к production эксплуатации! 🚀**

**Дата создания:** 2025-10-03  
**Последнее обновление:** 2025-10-03 16:00  
**Версия:** 2.0 (SRS-only)  
**Статус:** 🟢 STABLE

