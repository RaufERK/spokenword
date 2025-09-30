# 🖥️ Актуальная конфигурация сервера

Дата сохранения: **30 сентября 2025**

## 📁 Структура

```
SERVER_CONFIG/
├── icecast/
│   ├── icecast.xml              # Конфигурация Icecast2
│   └── audio-icecast@.service   # Systemd unit для аудио-стрима
├── nginx/
│   ├── nginx.conf               # Главная конфигурация nginx
│   └── spoken-word.ru           # Виртуальный хост сайта
├── scripts/
│   ├── start-icecast-audio.sh   # Вызывается nginx при старте стрима
│   ├── stop-icecast-audio.sh    # Вызывается nginx при остановке стрима
│   ├── start-audio-icecast.sh   # Запускает ffmpeg для Icecast
│   └── stop-audio-icecast.sh    # Останавливает ffmpeg
└── README.md                    # Этот файл
```

---

## 🎙️ Icecast Setup

### Установленные компоненты:
- **Icecast2** — сервер аудио-стриминга
- **FFmpeg** — транскодирование RTMP → Icecast MP3
- **Systemd unit** — управление процессом (опционально)
- **Nginx RTMP hooks** — автозапуск при старте стрима

### Как это работает:

1. **Стример запускает OBS** → `rtmp://spoken-word.ru/live/main`
2. **Nginx получает RTMP поток** → выполняет `exec_publish`
3. **Вызывается** `/usr/local/bin/start-icecast-audio.sh main`
4. **Запускается FFmpeg** → берет аудио из RTMP, отправляет в Icecast
5. **Пользователи слушают** → `https://spoken-word.ru/audio-stream/main`

### Автозапуск:

В `/etc/nginx/nginx.conf` в блоке `application live`:
```nginx
exec_publish /usr/local/bin/start-icecast-audio.sh $name;
exec_publish_done /usr/local/bin/stop-icecast-audio.sh $name;
```

---

## 🌐 Nginx

### Виртуальный хост:
- **HTTP (80)** → редирект на HTTPS
- **HTTPS (443)** → основной сайт + прокси на Next.js

### Важные location блоки:

```nginx
# Видео HLS
location /live/ {
    alias /srv/streaming/live/;
    # ... настройки кэширования
}

# Аудио Icecast
location /audio-stream/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    # ... CORS headers
}

# Next.js приложение
location / {
    proxy_pass http://127.0.0.1:3005;
    # ... proxy headers
}
```

---

## 📝 Скрипты

### `/usr/local/bin/start-icecast-audio.sh`
Вызывается nginx через `exec_publish`. Запускает ffmpeg в фоне.

**Логирование:** `/tmp/icecast-exec.log`

### `/usr/local/bin/start-audio-icecast.sh`
Основной скрипт запуска ffmpeg:
- Читает RTMP поток: `rtmp://127.0.0.1:1935/live/{key}`
- Транскодирует в MP3 128k
- Отправляет в Icecast: `icecast://source:PASSWORD@127.0.0.1:8000/main`

**Логирование:** `/var/log/icecast2/ffmpeg-{key}.log`

---

## 🔄 Восстановление конфигурации

### 1. Icecast

```bash
# Копировать конфигурацию
sudo cp icecast/icecast.xml /etc/icecast2/icecast.xml

# Копировать systemd unit
sudo cp icecast/audio-icecast@.service /etc/systemd/system/
sudo systemctl daemon-reload

# Запустить Icecast
sudo systemctl enable icecast2
sudo systemctl start icecast2
```

### 2. Скрипты

```bash
# Копировать все скрипты
sudo cp scripts/*.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/*icecast*.sh

# Создать директорию для логов
sudo mkdir -p /var/log/icecast2
sudo chown www-data:www-data /var/log/icecast2
```

### 3. Nginx

```bash
# Бэкап текущей конфигурации
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
sudo cp /etc/nginx/sites-available/spoken-word.ru /etc/nginx/sites-available/spoken-word.ru.backup

# Копировать новую конфигурацию
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp nginx/spoken-word.ru /etc/nginx/sites-available/spoken-word.ru

# Проверить и перезагрузить
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 Пароли

Пароли Icecast хранятся в `/root/icecast-passwords.txt` на сервере.

**Важно:** При восстановлении замени пароль в:
- `/etc/icecast2/icecast.xml` (source-password, relay-password, admin-password)
- `/usr/local/bin/start-audio-icecast.sh` (в URL `icecast://source:PASSWORD@...`)

---

## ✅ Проверка работы

```bash
# Icecast запущен
systemctl status icecast2

# FFmpeg процесс работает (когда стрим идёт)
ps aux | grep ffmpeg | grep icecast

# Стрим доступен
curl -I http://127.0.0.1:8000/main

# Через nginx
curl -I https://spoken-word.ru/audio-stream/main

# Проверить логи
tail -f /tmp/icecast-exec.log
tail -f /var/log/icecast2/ffmpeg-main.log
```

---

## 📊 Endpoints

| Назначение | URL |
|-----------|-----|
| RTMP для OBS | `rtmp://spoken-word.ru/live/main` |
| Аудио для пользователей | `https://spoken-word.ru/audio` |
| Прямой аудио стрим | `https://spoken-word.ru/audio-stream/main` |
| Видео HLS | `https://spoken-word.ru/live` |
| Статус стрима (API) | `https://spoken-word.ru/api/stream-status?key=main` |

---

## 🚨 Troubleshooting

### Аудио не работает:

1. **Проверить Icecast:**
   ```bash
   systemctl status icecast2
   curl http://127.0.0.1:8000/status-json.xsl
   ```

2. **Проверить FFmpeg:**
   ```bash
   ps aux | grep ffmpeg | grep icecast
   tail -f /var/log/icecast2/ffmpeg-main.log
   ```

3. **Проверить права:**
   ```bash
   ls -la /var/log/icecast2/
   sudo chown www-data:www-data /var/log/icecast2
   ```

4. **Перезапустить вручную:**
   ```bash
   /usr/local/bin/start-icecast-audio.sh main
   ```

### Nginx не запускает скрипты:

1. **Проверить права:**
   ```bash
   ls -la /usr/local/bin/*icecast*.sh
   sudo chmod +x /usr/local/bin/*icecast*.sh
   ```

2. **Проверить логи:**
   ```bash
   cat /tmp/icecast-exec.log
   ```

---

## 📚 Дополнительная документация

- `_ICECAST_SETUP/` — полная документация по миграции на Icecast
- `ICECAST_MIGRATION_DONE.md` — отчет о миграции

---

**Последнее обновление:** 30 сентября 2025  
**Статус:** ✅ Работает в продакшене
