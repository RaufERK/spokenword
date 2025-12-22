# 🚀 Деплой с автоматическим исправлением стриминга

## 🎯 Проблема
После деплоя через PM2 права доступа к файлам стриминга сбрасываются, что приводит к:
- Недоступности HLS файлов на мобильных устройствах
- Ошибкам "Stream not found" в API
- Проблемам с воспроизведением стрима

## ✅ Решение
В `ecosystem.config.cjs` добавлены команды для автоматического восстановления прав доступа после каждого деплоя.

## 🚀 Процесс деплоя

### 1. Обычный деплой (рекомендуется)
```bash
npm run deploy
```

### 2. Если нужен быстрый деплой без восстановления прав
```bash
pm2 deploy ecosystem.config.cjs production
```

### 3. После деплоя (если права не восстановились автоматически)
```bash
./scripts/fix-streaming-permissions.sh
```

## 🔧 Что происходит при деплое

1. **Обновление кода** из репозитория
2. **Установка зависимостей** (`npm ci`)
3. **Генерация Prisma** (`npx prisma generate`)
4. **Миграции БД** (`npx prisma migrate deploy`)
5. **Сборка приложения** (`npm run build`)
6. **🆕 Восстановление прав доступа:**
   - Создание папки `/srv/streaming/live/main/`
   - Установка владельца `www-data:www-data`
   - Установка прав `755` для папок
   - Установка прав `644` для файлов `.m3u8` и `.ts`
7. **Перезапуск PM2** (`pm2 startOrReload`)
8. **Сохранение PM2** (`pm2 save`)

## 📱 Тестирование после деплоя

### Проверка API
```bash
curl "https://spoken-word.ru/api/stream-status?key=main"
```

### Проверка HLS файла
```bash
curl -I "https://spoken-word.ru/live/main/index.m3u8"
```

### Полное тестирование
```bash
./scripts/test-mobile-streaming.sh
```

## 🚨 Если что-то пошло не так

### Быстрое исправление прав
```bash
./scripts/fix-streaming-permissions.sh
```

### Ручное исправление (на сервере)
```bash
ssh amster_app
sudo mkdir -p /srv/streaming/live/main
sudo chown -R www-data:www-data /srv/streaming/
sudo chmod -R 755 /srv/streaming/
sudo find /srv/streaming/ -name "*.m3u8" -exec chmod 644 {} \;
sudo find /srv/streaming/ -name "*.ts" -exec chmod 644 {} \;
```

### Перезапуск nginx
```bash
ssh amster "sudo systemctl reload nginx"
```

## 🎬 Тестирование стрима

### Из OBS Studio
- **Сервер:** `rtmp://185.200.178.73/live`
- **Ключ потока:** `main`

### Проверка на устройствах
- **Десктоп:** https://www.spoken-word.ru/
- **Мобильные:** https://spoken-word.ru/live
- **Прямая ссылка:** https://spoken-word.ru/live/main/index.m3u8

## 📊 Мониторинг

### Логи приложения
```bash
pm2 logs spokenword
```

### Логи nginx
```bash
ssh amster "sudo tail -f /var/log/nginx/spoken_word_error.log"
```

### Статус сервисов
```bash
pm2 status
ssh amster "sudo systemctl status nginx"
```

## ✅ Критерии успешного деплоя

1. ✅ Приложение запущено на порту 3005
2. ✅ API стрима отвечает корректно
3. ✅ HLS файл доступен с CORS заголовками
4. ✅ Права доступа установлены правильно
5. ✅ Стрим работает на всех устройствах

## 🎊 Результат

После деплоя система стриминга будет работать стабильно:
- Автоматическое восстановление прав доступа
- Корректная работа на мобильных устройствах
- Стабильное воспроизведение стрима
- Отсутствие ошибок CORS

---

**Теперь деплой не сломает стриминг!** 🚀
