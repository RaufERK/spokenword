# 🔧 Устранение проблем со стримингом

## ✅ Статус системы

**Все компоненты настроены и работают правильно:**
- ✅ Nginx с RTMP модулем запущен
- ✅ RTMP сервер слушает на порту 1935
- ✅ HLS конвертация работает
- ✅ API для проверки статуса стрима работает
- ✅ Плееры на главной странице и /live исправлены

## 🎯 Настройки для OBS Studio

**Сервер:** `rtmp://185.200.178.73/live`
**Ключ потока:** `main`

## 🌐 URL для просмотра

- **Главная страница:** https://www.spoken-word.ru/
- **Страница стрима:** https://spoken-word.ru/live
- **HLS поток:** https://spoken-word.ru/live/main/index.m3u8

## 🧪 Тестирование

### Быстрый тест стрима
```bash
# На сервере (ssh amster)
ffmpeg -f lavfi -i testsrc=duration=10:size=640x480:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=10 \
       -c:v libx264 -preset veryfast -c:a aac \
       -f flv rtmp://185.200.178.73/live/main
```

### Использование тестового скрипта
```bash
# На сервере (ssh amster)
cd /path/to/SPOKENWORD
./scripts/test-stream.sh
```

## 🔍 Диагностика проблем

### 1. Проверка статуса сервисов
```bash
ssh amster "sudo systemctl status nginx"
ssh amster "netstat -tlnp | grep 1935"
```

### 2. Проверка файлов стрима
```bash
ssh amster "ls -la /srv/streaming/live/main/"
ssh amster "curl -I https://spoken-word.ru/live/main/index.m3u8"
```

### 3. Проверка API
```bash
curl "https://spoken-word.ru/api/stream-status?key=main"
curl "https://spoken-word.ru/api/stream-link"
```

### 4. Проверка логов
```bash
ssh amster "sudo tail -f /var/log/nginx/spoken_word_error.log"
ssh amster "sudo journalctl -u nginx -f"
```

## 🚨 Частые проблемы

### Проблема: "404 Not Found" для HLS потока
**Причина:** Стрим не запущен или недавно завершился
**Решение:** Запустите стрим через OBS или тестовый скрипт

### Проблема: Плеер показывает "Трансляция не ведется"
**Причина:** API не находит активный стрим
**Решение:** Убедитесь, что стрим запущен и файлы обновляются

### Проблема: Стрим не воспроизводится в браузере
**Причина:** Проблемы с CORS или HLS.js
**Решение:** Проверьте консоль браузера, попробуйте другой браузер

## 📱 Поддержка браузеров

- **Safari:** Нативный HLS (лучшая производительность)
- **Chrome/Firefox/Edge:** HLS.js (автоматическая загрузка)
- **Мобильные:** Полная поддержка

## 🔧 Управление сервисами

```bash
# Перезапуск nginx
ssh amster "sudo systemctl restart nginx"

# Проверка статуса
ssh amster "sudo systemctl status nginx"

# Просмотр логов
ssh amster "sudo tail -f /var/log/nginx/spoken_word_error.log"
```

## 📁 Структура файлов

```
/srv/streaming/
├── live/           # HLS потоки
│   └── main/       # Папка для потока "main"
│       ├── index.m3u8
│       └── *.ts    # Сегменты видео
└── archive/        # Записи стримов
    └── *.flv       # Архивные файлы
```

---

## 🎊 Система готова к работе!

Все компоненты настроены правильно. Просто запустите стрим в OBS Studio с указанными настройками, и он появится на сайте.
