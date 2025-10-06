# 🎙️ Установка Icecast для аудио-стриминга

Полная миграция аудио-трансляции с HLS на Icecast2 для стабильной работы на всех устройствах.

---

## 🎯 Зачем Icecast?

### Проблемы с HLS для аудио:
- ❌ Задержка 4-12 секунд
- ❌ Проблемы на мобильных устройствах
- ❌ Буферизация и обрывы
- ❌ Избыточная нагрузка (преобразование видео в сегменты)

### Преимущества Icecast:
- ✅ Задержка 1-3 секунды
- ✅ Идеальная работа на мобильных (iOS, Android)
- ✅ Нативная поддержка MP3 в браузерах
- ✅ Меньше нагрузка на сервер
- ✅ Встроенная статистика слушателей
- ✅ Простой плеер (обычный `<audio>` без библиотек)

---

## 🏗️ Архитектура

### До (HLS):
```
OBS Studio → nginx-rtmp → HLS (m3u8 + ts) → Браузер (HLS.js)
```

### После (Icecast):
```
OBS Studio → nginx-rtmp ┬→ HLS (для видео /live)
                         └→ ffmpeg → Icecast2 → Браузер (нативный audio)
```

---

## 📦 Что включено

```
_ICECAST_SETUP/
├── icecast.xml                    # Конфигурация Icecast2
├── audio-icecast@.service         # Systemd unit
├── start-audio-icecast.sh         # ffmpeg → Icecast
├── stop-audio-icecast.sh          # Остановка ffmpeg
├── start-icecast-audio.sh         # Запуск сервиса (вызывается nginx)
├── stop-icecast-audio.sh          # Остановка сервиса (вызывается nginx)
├── nginx-rtmp-icecast.conf        # Патч для nginx rtmp
├── nginx-icecast-proxy.conf       # Патч для nginx http
├── install-icecast.sh             # Скрипт установки
└── README.md                      # Эта документация
```

---

## 🚀 Установка (пошагово)

### Шаг 1: Загрузить файлы на сервер

```bash
# На локальной машине
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/_ICECAST_SETUP
scp -r * amster:/root/icecast-setup/

# На сервере
ssh amster
cd /root/icecast-setup
chmod +x *.sh
```

---

### Шаг 2: Запустить установку

```bash
sudo ./install-icecast.sh
```

**Скрипт выполнит:**
1. ✅ Установит Icecast2
2. ✅ Сгенерирует пароли
3. ✅ Настроит конфигурацию
4. ✅ Установит скрипты в `/usr/local/bin/`
5. ✅ Создаст systemd unit
6. ✅ Запустит Icecast2

**Пароли сохраняются в:** `/root/icecast-passwords.txt`

---

### Шаг 3: Обновить nginx (RTMP блок)

```bash
sudo nano /etc/nginx/nginx.conf
```

Найти блок `application live` и добавить:

```nginx
application live {
    live on;
    
    # HLS для видео (остаётся)
    hls on;
    hls_path /srv/streaming/live;
    hls_fragment 2s;
    hls_playlist_length 60s;
    hls_continuous on;
    hls_cleanup on;
    hls_nested off;
    
    # 🆕 ДОБАВИТЬ: Icecast для аудио
    exec_publish /usr/local/bin/start-icecast-audio.sh $name;
    exec_publish_done /usr/local/bin/stop-icecast-audio.sh $name;
    
    drop_idle_publisher 0;
    idle_streams off;
}
```

---

### Шаг 4: Обновить nginx (HTTP блок)

```bash
sudo nano /etc/nginx/sites-available/spoken-word.ru
```

Добавить **внутри блока `server`**:

```nginx
# Proxy для Icecast аудио-стрима
location /audio-stream/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    add_header Cache-Control "no-cache";
}
```

---

### Шаг 5: Перезагрузить nginx

```bash
# Проверить конфигурацию
sudo nginx -t

# Перезагрузить
sudo systemctl reload nginx
```

---

### Шаг 6: Деплой frontend (локальная машина)

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD

# Закоммитить изменения
git add .
git commit -m "feat: migrate audio to Icecast for better mobile support"
git push

# Задеплоить
npm run deploy
```

---

## ✅ Проверка работы

### 1. Проверить Icecast

```bash
ssh amster
systemctl status icecast2
```

Должно быть: `active (running)`

### 2. Запустить стрим в OBS

- Сервер: `rtmp://185.200.178.73/live`
- Ключ: `main`

### 3. Проверить что ffmpeg запустился

```bash
ssh amster
systemctl status audio-icecast@main
```

Должно быть: `active (running)`

### 4. Проверить логи

```bash
# Логи Icecast
tail -f /var/log/icecast2/error.log

# Логи ffmpeg
tail -f /var/log/icecast2/ffmpeg-main.log

# Логи nginx
tail -f /var/log/nginx/error.log
```

### 5. Открыть в браузере

**Аудио:**
- https://spoken-word.ru/audio (ваш плеер)
- https://spoken-word.ru/audio-stream/main (прямая ссылка)

**Видео** (остаётся HLS):
- https://spoken-word.ru/live

---

## 🔧 Управление

### Вручную запустить/остановить аудио

```bash
# Запустить
sudo systemctl start audio-icecast@main

# Остановить
sudo systemctl stop audio-icecast@main

# Перезапустить
sudo systemctl restart audio-icecast@main
```

### Посмотреть статистику Icecast

```bash
# На сервере (только с localhost)
curl http://127.0.0.1:8000/status.xsl
```

### Перезапустить Icecast

```bash
sudo systemctl restart icecast2
```

---

## 📊 Мониторинг

### Проверить сколько слушателей

```bash
curl -s http://127.0.0.1:8000/status-json.xsl | jq '.icestats.source.listeners'
```

### Проверить что стрим онлайн

```bash
curl -s -I https://spoken-word.ru/audio-stream/main | head -n 1
```

Должно быть: `HTTP/1.1 200 OK`

---

## 🐛 Решение проблем

### Icecast не запускается

```bash
# Проверить логи
journalctl -u icecast2 -n 50

# Проверить конфигурацию
icecast2 -c /etc/icecast2/icecast.xml
```

### ffmpeg не запускается

```bash
# Проверить логи
journalctl -u audio-icecast@main -n 50

# Проверить что RTMP стрим идёт
ffprobe rtmp://127.0.0.1:1935/live/main
```

### Аудио не работает в браузере

1. Проверить что Icecast онлайн: `curl http://127.0.0.1:8000/main`
2. Проверить nginx proxy: `curl https://spoken-word.ru/audio-stream/main`
3. Открыть DevTools → Network → проверить запрос

### Нет звука

```bash
# Проверить что ffmpeg получает аудио из RTMP
tail -f /var/log/icecast2/ffmpeg-main.log

# Должны быть строки с "audio:"
```

---

## 📝 Технические детали

### Формат аудио:
- **Кодек:** MP3 (libmp3lame)
- **Битрейт:** 128 kbps
- **Частота:** 44100 Hz
- **Каналы:** 2 (стерео)

### Порты:
- **1935** — RTMP (OBS → nginx)
- **8000** — Icecast (только localhost)
- **443** — HTTPS (nginx proxy для `/audio-stream/`)

### Задержка:
- **RTMP → ffmpeg:** ~0.5 сек
- **ffmpeg → Icecast:** ~0.5 сек
- **Icecast → Браузер:** ~1 сек
- **Итого:** ~2 секунды

---

## 🔐 Безопасность

1. **Icecast слушает только localhost** (`bind-address>127.0.0.1`)
2. **Доступ через nginx proxy** с HTTPS
3. **Пароли сохранены в** `/root/icecast-passwords.txt` (права 600)
4. **Админка доступна** только с localhost

### После установки:

```bash
# Добавить пароли в AMSTER_KEYS репозиторий
ssh amster
cd /root/server-secrets
cp /root/icecast-passwords.txt .
git add icecast-passwords.txt
git commit -m "added icecast passwords"
git push

# Создать snapshot конфигурации
cd /root/server-configs
./tools/make-snapshot.sh "добавлен Icecast для аудио-стриминга"
```

---

## 🎉 Результат

После установки:

✅ Аудио работает на всех устройствах (iOS, Android, Desktop)  
✅ Задержка < 2 секунд  
✅ Стабильная работа без обрывов  
✅ Простой плеер без библиотек  
✅ Меньше нагрузка на сервер  
✅ Видео остаётся на HLS (работает параллельно)

---

## 📞 Поддержка

При проблемах проверить:
1. `systemctl status icecast2`
2. `systemctl status audio-icecast@main`
3. `tail -f /var/log/icecast2/error.log`
4. `nginx -t && systemctl reload nginx`

**Всё должно работать стабильно!** 🚀










