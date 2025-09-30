# 📝 История изменений SERVER_CONFIG

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
