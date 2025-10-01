# 📝 История изменений SERVER_CONFIG

## 2025-10-01 — Adaptive HLS с FFmpeg транскодированием ⭐

### 🎯 Задача:
Обеспечить надёжную работу видео стрима на всех мобильных устройствах с автоматическим выбором качества.

### ✅ Решение:
Внедрено адаптивное HLS-вещание с перекодированием на сервере в 3 профиля качества.

### 🔧 Что изменилось:

#### 1. **NGINX RTMP конфигурация:**
- Добавлен внутренний RTMP application (порт 1936) для FFmpeg
- Основной application теперь пушит поток во внутренний
- Автозапуск FFmpeg при публикации стрима через `exec_publish`

#### 2. **FFmpeg транскодирование:**
- Создан скрипт `/usr/local/bin/start-hls-transcoding.sh`
- Перекодирование в 3 профиля:
  - **240p @ 400 Kbps** (baseline profile) — для 3G/слабых сетей
  - **360p @ 600 Kbps** (baseline profile) — для 4G
  - **480p @ 900 Kbps** (baseline profile) — для WiFi/десктопов
- Сегменты по 2 секунды для быстрого переключения
- Создание мастер-плейлиста с adaptive bitrate

#### 3. **NGINX HTTP конфигурация:**
- Добавлен `location /hls/` для раздачи adaptive HLS
- Правильные CORS заголовки
- Отключён кэш для live контента

#### 4. **Клиентская часть:**
- Обновлён плеер для работы с мастер-плейлистом
- Улучшенная обработка ошибок и ретраи
- Оптимизация для мобильных устройств

### 📁 Новые файлы:
- `scripts/start-hls-transcoding.sh` — запуск FFmpeg транскодирования
- `scripts/stop-hls-transcoding.sh` — остановка FFmpeg
- `nginx/nginx.conf` — обновлённая конфигурация с двумя RTMP серверами
- `nginx/spoken-word.ru` — добавлен location /hls/

### 🎬 Архитектура:
```
OBS (1280x720 @ 1500 Kbps)
  ↓ RTMP
NGINX :1935 /live
  ↓ push
NGINX :1936 /internal (localhost only)
  ↓ consume
FFmpeg транскодирование
  ↓ создаёт
3 HLS профиля + master.m3u8
  ↓ /srv/streaming/hls/main/
Пользователи (adaptive bitrate)
```

### 📊 Ресурсы:
- **CPU:** 2-3 ядра при активном стриме
- **RAM:** ~500-700 MB дополнительно
- **Задержка:** +5-8 секунд (приемлемо)

### 🎉 Результат:
- ✅ Стрим работает на всех мобильных устройствах
- ✅ Автоматическое переключение качества по скорости сети
- ✅ Максимальная надёжность для текстового контента
- ✅ Даже при плохих настройках OBS — на выходе правильный поток

---

## 2025-10-01 — Исправлена проблема с HLS стримингом

### 🎯 Проблема:
При запуске видео стрима файлы не работали до запуска команды `npm run fix`, которая создавала симлинки.

### ✅ Решение:
1. **NGINX RTMP**: изменён параметр `hls_nested off` → `hls_nested on`
2. **Структура файлов**: теперь NGINX создаёт файлы сразу в правильной структуре:
   - `/srv/streaming/live/main/index.m3u8`
   - `/srv/streaming/live/main/*.ts`
3. **Скрипт fix-streaming-permissions.sh**: упрощён, убраны ненужные симлинки

### 📁 Изменённые файлы:
- `nginx/nginx.conf` — включён `hls_nested on` в RTMP блоке
- `scripts/fix-streaming-permissions.sh` — упрощённая версия без симлинков

### 🎉 Результат:
Стрим работает сразу после запуска из OBS, без дополнительных команд.

---

## 2025-09-30 — Первое сохранение рабочей конфигурации

### ✅ Что сохранено:

#### 🎙️ Icecast (аудио-стриминг):
- `icecast.xml` — конфигурация Icecast2 сервера
- `audio-icecast@.service` — systemd unit для управления

#### 🌐 Nginx:
- `nginx.conf` — главная конфигурация с RTMP модулем
- `spoken-word.ru` — виртуальный хост сайта

#### 📜 Скрипты:
- `start-icecast-audio.sh` — вызывается nginx при старте RTMP стрима
- `stop-icecast-audio.sh` — вызывается nginx при остановке RTMP стрима
- `start-audio-icecast.sh` — запускает ffmpeg для транскодирования
- `stop-audio-icecast.sh` — останавливает ffmpeg

#### 🔧 Утилиты:
- `restore-config.sh` — скрипт быстрого восстановления конфигурации
- `README.md` — полная документация

### 🎯 Что работает:

1. **RTMP стрим** → автоматически запускает Icecast аудио
2. **Icecast MP3 стрим** → доступен через HTTPS прокси
3. **Nginx** → обрабатывает RTMP, HLS, Icecast, Next.js
4. **Логирование** → `/tmp/icecast-exec.log` и `/var/log/icecast2/`

### 🔑 Ключевые настройки:

#### Nginx RTMP блок:
```nginx
application live {
    # ...
    exec_publish /usr/local/bin/start-icecast-audio.sh $name;
    exec_publish_done /usr/local/bin/stop-icecast-audio.sh $name;
}
```

#### Nginx HTTP блок:
```nginx
location /audio-stream/ {
    proxy_pass http://127.0.0.1:8000/;
    # ... proxy настройки
}
```

### 📊 Endpoints:
- `rtmp://spoken-word.ru/live/main` — RTMP для OBS
- `https://spoken-word.ru/audio` — аудио страница для пользователей
- `https://spoken-word.ru/audio-stream/main` — прямой Icecast стрим
- `https://spoken-word.ru/live` — видео HLS стрим

### 🎉 Статус:
**✅ Работает в продакшене**

---

## Восстановление конфигурации:

```bash
# 1. Загрузить на сервер
scp -r _REPO_SETUP/SERVER_CONFIG/ user@server:/root/

# 2. Запустить восстановление
ssh user@server
cd /root/SERVER_CONFIG
sudo ./restore-config.sh

# 3. Проверить
systemctl status icecast2
curl -I https://spoken-word.ru/audio-stream/main
```

---

**Дата:** 30 сентября 2025  
**Коммит:** db37e50  
**Версия:** 1.0
