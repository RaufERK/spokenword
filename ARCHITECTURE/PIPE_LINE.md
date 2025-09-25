# 🎬 Архитектура стриминга SpokenWord

## 📋 Обзор системы

SpokenWord - это веб-приложение для стриминга с поддержкой RTMP, HLS и автоматического архивирования. Система построена на Next.js + Prisma + SQLite с nginx RTMP модулем.

## 🏗️ Архитектурная схема

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OBS Studio    │───▶│   RTMP Server   │───▶│   HLS Stream    │
│                 │    │   (nginx:1935)  │    │   (nginx:443)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Archive       │    │   Web Player    │
                       │   (FLV files)   │    │   (HLS.js)      │
                       └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │   API Status    │
                       │   (SQLite)      │    │   (/api/stream) │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 Компоненты системы

### 1. **RTMP Сервер (nginx)**
- **Порт:** 1935
- **Конфигурация:** `/etc/nginx/nginx.conf`
- **Приложения:**
  - `live` - основной стрим
  - `conf` - конференции

### 2. **HLS Конвертация**
- **Встроенный nginx HLS модуль**
- **Настройки:**
  - `hls_nested off` - файлы в корне папки
  - `hls_fragment 2s` - сегменты по 2 секунды
  - `hls_playlist_length 60s` - плейлист на 60 секунд

### 3. **Веб-сервер (nginx)**
- **Порт:** 443 (HTTPS)
- **Конфигурация:** `/etc/nginx/sites-available/spoken-word.ru`
- **CORS заголовки** для HLS файлов
- **Проксирование** на Next.js (порт 3005)

### 4. **Next.js Приложение**
- **Порт:** 3005
- **PM2:** `ecosystem.config.cjs`
- **API endpoints:**
  - `/api/stream-status` - проверка статуса стрима
  - `/api/stream-link` - управление ссылками

### 5. **База данных (SQLite)**
- **Prisma ORM**
- **Таблицы:**
  - `StreamLink` - ссылки на стримы
  - `User` - пользователи
  - `ConferenceFile` - файлы конференций

## 📁 Структура файлов

### **Серверные файлы:**
```
/srv/streaming/
├── live/                    # HLS потоки
│   ├── main.m3u8           # Основной плейлист
│   ├── main-0.ts           # Сегменты видео
│   ├── main-1.ts
│   └── main/                # Папка для API
│       └── index.m3u8      # Символическая ссылка
└── archive/                 # Архивные записи
    └── *.flv               # FLV файлы
```

### **Конфигурационные файлы:**
```
/etc/nginx/
├── nginx.conf              # Основная конфигурация с RTMP
└── sites-available/
    └── spoken-word.ru      # Конфигурация сайта

/etc/systemd/system/
├── hls-worker@.service     # HLS конвертация
└── stream-archive@.service # Архивирование

/usr/local/bin/
├── start-hls.sh           # Скрипт HLS конвертации
├── start-stream-services.sh # Запуск сервисов
└── stop-stream-services.sh  # Остановка сервисов
```

### **Файлы проекта:**
```
/Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/
├── app/
│   ├── api/
│   │   ├── stream-status/route.ts    # API статуса стрима
│   │   └── stream-link/route.ts      # API ссылок
│   ├── live/page.tsx                 # Страница стрима
│   └── page.tsx                      # Главная страница
├── components/
│   ├── HlsPlayer.tsx                 # HLS плеер
│   └── StreamLinkBlock.tsx           # Блок ссылок
├── server/
│   ├── NGINX/                        # Конфигурации nginx
│   ├── SCRIPTS-SH/                   # Серверные скрипты
│   └── UNITS/                        # Systemd сервисы
├── scripts/                          # Локальные скрипты
├── ecosystem.config.cjs              # PM2 конфигурация
└── package.json                      # NPM скрипты
```

## 🔄 Процесс стриминга

### **1. Начало стрима:**
```
OBS Studio → rtmp://185.200.178.73/live/main
    ↓
nginx RTMP модуль принимает поток
    ↓
nginx HLS модуль создает:
    - main.m3u8 (плейлист)
    - main-0.ts, main-1.ts... (сегменты)
    ↓
Символическая ссылка: main.m3u8 → main/index.m3u8
```

### **2. Воспроизведение:**
```
Браузер запрашивает: https://spoken-word.ru/live/main/index.m3u8
    ↓
nginx отдает HLS файл с CORS заголовками
    ↓
HlsPlayer.tsx загружает плейлист
    ↓
Браузер запрашивает сегменты: main-0.ts, main-1.ts...
    ↓
nginx отдает сегменты с CORS заголовками
    ↓
Видео воспроизводится
```

### **3. Архивирование:**
```
nginx RTMP модуль автоматически записывает:
    - Формат: FLV
    - Путь: /srv/streaming/archive/
    - Имя: уникальное с timestamp
```

## 🛠️ Скрипты и их назначение

### **Локальные скрипты (scripts/):**
- `fix-streaming-permissions.sh` - восстановление прав доступа
- `fix-streaming-quick.sh` - быстрое исправление через SSH
- `test-stream-complete.sh` - полное тестирование стрима
- `test-mobile-streaming.sh` - тестирование на мобильных
- `fix-hls-links.sh` - создание символических ссылок

### **Серверные скрипты (server/SCRIPTS-SH/):**
- `start-hls.sh` - HLS конвертация через ffmpeg
- `start-hls-improved.sh` - улучшенная HLS конвертация
- `start-stream-services.sh` - запуск systemd сервисов
- `stop-stream-services.sh` - остановка systemd сервисов

### **Systemd сервисы (server/UNITS/):**
- `hls-worker@.service` - HLS конвертация для каждого потока
- `stream-archive@.service` - Архивирование потоков
- `hls-conf@.service` - HLS для конференций

## 🔌 API Endpoints

### **GET /api/stream-status?key=main**
```json
{
  "isLive": true,
  "streamKey": "main",
  "lastModified": "2025-09-17T16:11:50.836Z",
  "fileAge": 3
}
```

### **GET /api/stream-link**
```json
{
  "success": true,
  "data": "https://example.com/stream"
}
```

### **POST /api/stream-link** (только MODERATOR+)
```json
{
  "url": "https://example.com/stream"
}
```

## 🎯 Настройки OBS Studio

### **Основной стрим:**
- **Сервер:** `rtmp://185.200.178.73/live`
- **Ключ потока:** `main`

### **Конференции:**
- **Сервер:** `rtmp://185.200.178.73/conf`
- **Ключ потока:** `conference_name`

## 🌐 URL для просмотра

### **Веб-интерфейс:**
- **Главная:** https://www.spoken-word.ru/
- **Стрим:** https://spoken-word.ru/live

### **Прямые ссылки:**
- **HLS плейлист:** https://spoken-word.ru/live/main/index.m3u8
- **Сегменты:** https://spoken-word.ru/live/main-0.ts

### **Статистика RTMP:**
- **URL:** http://185.200.178.73:8080/stat

## 🚀 Процесс деплоя

### **Автоматический деплой:**
```bash
npm run deploy:full
```

**Что происходит:**
1. `npm run deploy` - деплой через PM2
2. `npm run fix-streaming` - восстановление прав доступа
3. Создание символических ссылок для HLS
4. Готово к работе!

### **Ручной деплой:**
```bash
npm run deploy
npm run fix-streaming
```

## 🔧 Устранение неполадок

### **Проверка статуса:**
```bash
# API стрима
curl "https://spoken-word.ru/api/stream-status?key=main"

# HLS файл
curl -I "https://spoken-word.ru/live/main/index.m3u8"

# Сегменты
curl -I "https://spoken-word.ru/live/main-0.ts"
```

### **Проверка сервисов:**
```bash
# nginx
sudo systemctl status nginx

# RTMP
netstat -tlnp | grep 1935

# Next.js
pm2 status

# HLS сервис
sudo systemctl status hls-worker@main.service
```

### **Логи:**
```bash
# nginx
sudo tail -f /var/log/nginx/spoken_word_error.log

# Next.js
pm2 logs spokenword

# HLS
sudo tail -f /srv/streaming/live/main/ffmpeg.log
```

## 📱 Поддержка браузеров

### **Десктоп:**
- **Safari:** Нативный HLS (лучшая производительность)
- **Chrome/Firefox/Edge:** HLS.js

### **Мобильные:**
- **iPhone/iPad Safari:** Нативный HLS
- **Android Chrome:** HLS.js
- **Другие:** HLS.js с автоматическим выбором качества

## 🎊 Результат

Система обеспечивает:
- ✅ Стабильный RTMP прием потоков
- ✅ Автоматическую HLS конвертацию
- ✅ Кроссплатформенное воспроизведение
- ✅ Автоматическое архивирование
- ✅ CORS поддержку для всех браузеров
- ✅ Мобильную совместимость
- ✅ Автоматическое восстановление после деплоя

---

**Архитектура готова к масштабированию и расширению функциональности!** 🚀
