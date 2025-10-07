# 🏗️ Архитектура Icecast для аудио-стриминга

## 📊 Схема работы

### Полная схема (Видео + Аудио)

```
                    ┌─────────────┐
                    │  OBS Studio │
                    │  (стример)  │
                    └──────┬──────┘
                           │ RTMP (rtmp://185.200.178.73:1935/live/main)
                           ↓
                  ┌────────────────┐
                  │  nginx-rtmp    │ (порт 1935)
                  │  (получение)   │
                  └────────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ↓                         ↓
    ┌─────────────────┐      ┌──────────────────┐
    │   HLS модуль    │      │    ffmpeg        │
    │  (встроенный)   │      │  (извлечение     │
    │                 │      │   аудио)         │
    └────────┬────────┘      └────────┬─────────┘
             │                        │
             │ (TS сегменты)          │ (MP3 поток)
             │                        │
             ↓                        ↓
    ┌─────────────────┐      ┌──────────────────┐
    │ /srv/streaming/ │      │   Icecast2       │
    │     live/       │      │  (порт 8000)     │
    │   main.m3u8     │      │  /main           │
    └────────┬────────┘      └────────┬─────────┘
             │                        │
             │                        │
             └──────────┬─────────────┘
                        │
                        ↓
              ┌──────────────────┐
              │  nginx (HTTPS)   │ (порт 443)
              │  proxy + static  │
              └────────┬─────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ↓                         ↓
┌──────────────────┐      ┌──────────────────┐
│  /live           │      │  /audio-stream/  │
│  (HLS видео)     │      │  (Icecast MP3)   │
└─────────┬────────┘      └────────┬─────────┘
          │                        │
          ↓                        ↓
┌──────────────────┐      ┌──────────────────┐
│   HlsPlayer      │      │  IcecastPlayer   │
│   (HLS.js)       │      │  (нативный)      │
└──────────────────┘      └──────────────────┘
          │                        │
          ↓                        ↓
┌──────────────────┐      ┌──────────────────┐
│  /live           │      │  /audio          │
│  (видео)         │      │  (аудио)         │
└──────────────────┘      └──────────────────┘
```

---

## 🔄 Поток данных

### 1. OBS → nginx-rtmp

**Протокол:** RTMP  
**URL:** `rtmp://185.200.178.73:1935/live/main`  
**Формат:** H.264 (видео) + AAC (аудио)  
**Задержка:** ~0.5 сек

### 2. nginx-rtmp → HLS (для видео)

**Процесс:** Встроенный HLS модуль nginx  
**Результат:** `/srv/streaming/live/main.m3u8` + `*.ts` сегменты  
**Параметры:**
- `hls_fragment 2s` — сегменты по 2 сек
- `hls_playlist_length 60s` — плейлист 60 сек
- `hls_continuous on` — непрерывная нумерация

**Задержка:** +2-4 сек (сегментация)

### 3. nginx-rtmp → ffmpeg → Icecast (для аудио)

**Процесс:**
```bash
ffmpeg -i rtmp://127.0.0.1:1935/live/main \
       -vn -map 0:a \
       -c:a libmp3lame -b:a 128k \
       -f mp3 \
       icecast://source:password@127.0.0.1:8000/main
```

**Результат:** Живой MP3 поток в Icecast  
**Параметры:**
- Битрейт: 128 kbps
- Частота: 44100 Hz
- Стерео

**Задержка:** +1 сек (преобразование)

### 4. nginx → Браузер

**Видео:**
- URL: `https://spoken-word.ru/live/main.m3u8`
- Плеер: HLS.js (JavaScript)
- Формат: HLS (m3u8 + ts)
- Задержка: 4-6 сек

**Аудио:**
- URL: `https://spoken-word.ru/audio-stream/main`
- Плеер: Нативный `<audio>`
- Формат: MP3
- Задержка: 1-2 сек

---

## 🔌 Порты и сервисы

| Сервис | Порт | Доступ | Назначение |
|--------|------|--------|------------|
| nginx-rtmp | 1935 | Интернет | Приём RTMP от OBS |
| Icecast2 | 8000 | localhost | Аудио-стрим (MP3) |
| nginx (http) | 80 | Интернет | Redirect на HTTPS |
| nginx (https) | 443 | Интернет | Веб-сайт + proxy |
| Next.js | 3005 | localhost | Frontend приложение |

---

## 📁 Файловая структура

### На сервере:

```
/srv/streaming/
├── live/                       # HLS сегменты (видео)
│   ├── main.m3u8              # Плейлист
│   ├── main-0.ts              # Сегменты
│   ├── main-1.ts
│   └── ...
└── archive/                    # Архивы стримов
    └── *.flv

/etc/icecast2/
└── icecast.xml                 # Конфигурация Icecast

/etc/nginx/
├── nginx.conf                  # Главная конфиг (RTMP блок)
└── sites-available/
    └── spoken-word.ru          # Виртуальный хост (HTTP/proxy)

/usr/local/bin/
├── start-audio-icecast.sh      # ffmpeg → Icecast
├── stop-audio-icecast.sh       # Остановка ffmpeg
├── start-icecast-audio.sh      # systemctl start
└── stop-icecast-audio.sh       # systemctl stop

/etc/systemd/system/
└── audio-icecast@.service      # Systemd unit для аудио

/var/log/icecast2/
├── access.log                  # Лог доступа
├── error.log                   # Ошибки
└── ffmpeg-main.log             # Лог ffmpeg
```

---

## 🔐 Безопасность

### Уровни защиты:

1. **Icecast слушает только localhost**
   - `bind-address>127.0.0.1`
   - Не доступен из интернета напрямую

2. **nginx proxy с HTTPS**
   - Весь трафик через HTTPS
   - CORS заголовки для кросс-доменных запросов

3. **Пароли Icecast**
   - Source password — для ffmpeg
   - Admin password — для админки
   - Сохранены в `/root/icecast-passwords.txt` (права 600)

4. **Systemd изоляция**
   - ffmpeg запускается от `www-data`
   - Нет root прав

---

## ⚡ Производительность

### Нагрузка на сервер:

| Компонент | CPU | RAM | Disk I/O |
|-----------|-----|-----|----------|
| nginx-rtmp | ~5% | 50 MB | Средний |
| ffmpeg (HLS) | 0% | 0 MB | Нет (встроен в nginx) |
| ffmpeg (Icecast) | ~10% | 30 MB | Низкий |
| Icecast2 | ~2% | 20 MB | Низкий |
| **Итого** | **~17%** | **~100 MB** | **Низкий** |

*Для 1 одновременного стрима*

### Пропускная способность:

**Входящий:**
- OBS → nginx: ~3-5 Mbps (настройки OBS)

**Исходящий (на 1 зрителя/слушателя):**
- Видео HLS: ~2-4 Mbps
- Аудио Icecast: ~128 kbps (0.128 Mbps)

**Пример:**
- 10 зрителей видео: 20-40 Mbps
- 50 слушателей аудио: 6.4 Mbps
- **Итого:** ~26-46 Mbps

---

## 🔄 Автозапуск и управление

### При старте стрима (OBS):

1. OBS начинает отправлять RTMP → nginx
2. nginx запускает: `exec_publish /usr/local/bin/start-icecast-audio.sh main`
3. Скрипт запускает: `systemctl start audio-icecast@main`
4. Systemd запускает: `/usr/local/bin/start-audio-icecast.sh main`
5. ffmpeg начинает преобразование RTMP → Icecast MP3
6. Icecast начинает раздавать аудио на `/main`

### При остановке стрима (OBS):

1. OBS прекращает RTMP
2. nginx запускает: `exec_publish_done /usr/local/bin/stop-icecast-audio.sh main`
3. Скрипт останавливает: `systemctl stop audio-icecast@main`
4. Systemd останавливает ffmpeg
5. Icecast перестаёт раздавать аудио

---

## 📊 Мониторинг

### Проверка статуса:

```bash
# Icecast
systemctl status icecast2
curl http://127.0.0.1:8000/status.xsl

# ffmpeg для аудио
systemctl status audio-icecast@main
tail -f /var/log/icecast2/ffmpeg-main.log

# nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Количество слушателей
curl -s http://127.0.0.1:8000/status-json.xsl | jq '.icestats.source.listeners'
```

---

## 🎯 Преимущества новой архитектуры

### Для пользователей:

✅ Аудио работает на всех устройствах  
✅ Минимальная задержка (1-3 сек)  
✅ Стабильная работа без обрывов  
✅ Простой плеер (быстрая загрузка)

### Для разработчиков:

✅ Понятная архитектура  
✅ Легко мониторить и отлаживать  
✅ Стандартные протоколы (MP3, HTTP)  
✅ Отдельные логи для каждого компонента

### Для сервера:

✅ Умеренная нагрузка  
✅ Надёжные проверенные решения (Icecast)  
✅ Автоматическое управление через systemd  
✅ Изолированные процессы

---

## 🔮 Будущие улучшения (опционально)

- [ ] Статистика слушателей в реальном времени
- [ ] Несколько качеств аудио (64k, 128k, 320k)
- [ ] Запись аудио отдельно от видео
- [ ] Icecast Relay для CDN
- [ ] Метаданные в потоке (название трека)











