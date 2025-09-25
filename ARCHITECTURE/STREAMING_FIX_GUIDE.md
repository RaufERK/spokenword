# 🔧 Руководство по исправлению проблем со стримингом

## 🎯 Проблемы, которые были выявлены:

1. **Конфликт портов** - nginx проксирует на порт 3000, а приложение запускается на 3005
2. **Отсутствие HLS файлов** - система не создает файлы для воспроизведения
3. **Проблемы с правами доступа** - приложение не может читать файлы стрима
4. **Неполная конфигурация nginx** - отсутствуют CORS заголовки и правильная обработка HLS

## 🛠️ Пошаговое исправление:

### Шаг 1: Подключение к серверу
```bash
ssh amster_app
cd /home/appuser/apps/spokenword/source
```

### Шаг 2: Обновление конфигурации nginx
```bash
# Создаем резервную копию текущей конфигурации
sudo cp /etc/nginx/sites-available/spoken-word.ru /etc/nginx/sites-available/spoken-word.ru.backup

# Копируем исправленную конфигурацию
sudo cp server/NGINX/spokenword-fixed.conf /etc/nginx/sites-available/spoken-word.ru

# Проверяем конфигурацию
sudo nginx -t

# Если все ОК, перезапускаем nginx
sudo systemctl reload nginx
```

### Шаг 3: Обновление скриптов HLS
```bash
# Копируем улучшенный скрипт
sudo cp server/SCRIPTS-SH/start-hls-improved.sh /usr/local/bin/start-hls.sh
sudo chmod +x /usr/local/bin/start-hls.sh

# Обновляем systemd сервис
sudo cp server/UNITS/hls-worker@.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### Шаг 4: Исправление прав доступа
```bash
# Запускаем скрипт исправления
chmod +x scripts/fix-streaming-issues.sh
./scripts/fix-streaming-issues.sh
```

### Шаг 5: Перезапуск приложения
```bash
# Перезапускаем приложение через PM2
pm2 restart spokenword
pm2 save
```

### Шаг 6: Тестирование
```bash
# Запускаем полное тестирование
chmod +x scripts/test-stream-complete.sh
./scripts/test-stream-complete.sh
```

## 🔍 Диагностика проблем:

### Проверка статуса сервисов:
```bash
# Nginx
sudo systemctl status nginx

# RTMP сервер
netstat -tlnp | grep 1935

# Приложение Next.js
pm2 status

# HLS сервис
sudo systemctl status hls-worker@main.service
```

### Проверка логов:
```bash
# Логи nginx
sudo tail -f /var/log/nginx/spoken_word_error.log

# Логи ffmpeg
sudo tail -f /srv/streaming/live/main/ffmpeg.log

# Логи приложения
pm2 logs spokenword
```

### Проверка файлов:
```bash
# HLS файлы
ls -la /srv/streaming/live/main/

# Права доступа
ls -la /srv/streaming/
```

## 🎬 Тестирование стрима:

### Из OBS Studio:
- **Сервер:** `rtmp://185.200.178.73/live`
- **Ключ потока:** `main`

### Проверка на сайте:
- **Главная страница:** https://www.spoken-word.ru/
- **Страница стрима:** https://spoken-word.ru/live
- **HLS поток:** https://spoken-word.ru/live/main/index.m3u8

### API проверки:
```bash
# Статус стрима
curl "https://spoken-word.ru/api/stream-status?key=main"

# Ссылка на стрим
curl "https://spoken-word.ru/api/stream-link"
```

## 🚨 Частые проблемы и решения:

### Проблема: "Stream not found"
**Решение:**
```bash
sudo chmod -R 755 /srv/streaming/
sudo chown -R www-data:www-data /srv/streaming/
sudo systemctl restart nginx
```

### Проблема: "404 Not Found" для HLS
**Решение:**
```bash
sudo mkdir -p /srv/streaming/live/main
sudo touch /srv/streaming/live/main/index.m3u8
sudo chown www-data:www-data /srv/streaming/live/main/index.m3u8
```

### Проблема: CORS ошибки в браузере
**Решение:** Убедитесь, что используется исправленная конфигурация nginx с CORS заголовками

### Проблема: Приложение не отвечает
**Решение:**
```bash
pm2 restart spokenword
pm2 logs spokenword
```

## 📊 Мониторинг:

### Статистика RTMP (если включена):
- URL: http://185.200.178.73:8080/stat

### Проверка производительности:
```bash
# Использование CPU
top -p $(pgrep nginx)

# Использование памяти
free -h

# Дисковое пространство
df -h /srv/streaming/
```

## ✅ Критерии успешного исправления:

1. ✅ API `/api/stream-status` возвращает `{"isLive": true}` при активном стриме
2. ✅ HLS файл доступен по URL `https://spoken-word.ru/live/main/index.m3u8`
3. ✅ Плеер на сайте показывает "В эфире" при активном стриме
4. ✅ Стрим воспроизводится без ошибок CORS
5. ✅ Архивные файлы создаются в `/srv/streaming/archive/`

## 🎊 После исправления:

Система стриминга должна работать стабильно:
- Автоматическое создание HLS файлов при начале стрима
- Корректное отображение статуса на сайте
- Воспроизведение без ошибок во всех браузерах
- Автоматическое архивирование стримов

---

**Важно:** После внесения изменений обязательно протестируйте систему с реальным стримом из OBS Studio!
