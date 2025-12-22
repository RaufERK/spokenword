# 🧪 Быстрый тест системы сжатия

## ✅ Чек-лист перед тестом

### 1. Проверьте что Redis работает:
```bash
redis-cli ping
```
Ожидаем: `PONG`

Если нет - запустите:
```bash
# macOS (через brew)
brew services start redis

# Linux
sudo systemctl start redis
```

---

## 🚀 Тест на локальной машине

### 1. Запустите Next.js:
```bash
npm run dev
```

### 2. В ОТДЕЛЬНОМ терминале запустите worker:
```bash
npm run dev:worker
```

Должно появиться:
```
🔄 Video compression worker started (concurrency: 1)
✅ Redis connected
```

### 3. Откройте браузер:
```
http://localhost:3000/admin/packages
```

### 4. Создайте пакет:
- Нажмите "Создать пакет"
- Введите название
- Укажите цену
- Сохраните

### 5. Загрузите МАЛЕНЬКИЙ файл (10-50MB):
- Нажмите "Загрузить файл"
- Выберите видео файл
- Отправьте

### 6. Смотрите логи в терминале worker:
Должно быть примерно так:
```
📋 Добавлено в очередь: 1_1699567890_test.mp4

🎬 Начинаем сжатие: test.mp4
📊 Размер: 25MB
📉 Сжатие: 25MB → 8MB
🎯 Коэффициент: 68%
✅ Готово: test.mp4

✅ Job 1_1699567890_test.mp4 completed
```

---

## 🧪 Тест защиты от дубликатов

### 1. Попробуйте загрузить ТОТ ЖЕ файл снова:
Должна появиться ошибка:
```
"Файл test.mp4 уже загружен в этот пакет"
```

### 2. Проверьте статус в Redis:
```bash
redis-cli GET "upload:1:test.mp4"
```

Должно быть:
```json
{"status":"done","itemId":1,"timestamp":1699567890}
```

---

## 🐛 Тест обработки ошибок

### 1. Остановите worker:
- Нажмите Ctrl+C в терминале worker

### 2. Загрузите файл:
- Файл сохранится
- Попадёт в очередь
- Но НЕ обработается (worker выключен)

### 3. Проверьте очередь:
```bash
redis-cli LLEN bull:video-compression:wait
```
Должно быть: `1` (или больше)

### 4. Запустите worker снова:
```bash
npm run dev:worker
```

Worker автоматически подхватит задачу из очереди!

---

## 🎯 Тест на продакшене

### 1. Деплой:
```bash
npm run deploy
```

### 2. Проверьте что оба процесса запущены:
```bash
ssh amster_app "pm2 list"
```

Должно быть:
```
spokenword  │ online
video-worker│ online
```

### 3. Загрузите файл через админку:
```
https://spokenword.ru/admin/packages
```

### 4. Смотрите логи:
```bash
ssh amster_app "pm2 logs video-worker --lines 20"
```

---

## ✅ Критерии успеха

- [ ] Redis отвечает на ping
- [ ] Worker запускается без ошибок
- [ ] Файл добавляется в очередь
- [ ] Worker обрабатывает файл
- [ ] Файл сжимается (размер меньше)
- [ ] Запись появляется в БД
- [ ] Временный файл удаляется
- [ ] Дубликаты блокируются
- [ ] Worker переживает краш (перезапуск)
- [ ] Очередь не теряется при краше

---

## 🆘 Если что-то не работает

### Redis не отвечает:
```bash
# Проверьте статус
redis-cli ping

# Перезапустите
brew services restart redis  # macOS
sudo systemctl restart redis  # Linux
```

### Worker не запускается:
```bash
# Проверьте зависимости
npm list bullmq ioredis tsx

# Переустановите
npm install bullmq ioredis tsx
```

### Файлы не обрабатываются:
```bash
# Проверьте очередь
redis-cli LLEN bull:video-compression:wait

# Посмотрите логи
pm2 logs video-worker --lines 50
```

### FFmpeg не найден:
```bash
# Установите ffmpeg
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Ubuntu
```

---

## 📊 Команды для отладки

### Очистить очередь:
```bash
redis-cli DEL bull:video-compression:wait
redis-cli DEL bull:video-compression:active
```

### Очистить статусы файлов:
```bash
redis-cli KEYS "upload:*" | xargs redis-cli DEL
```

### Посмотреть все задачи:
```bash
redis-cli KEYS "bull:video-compression:*"
```

### Перезапустить worker:
```bash
pm2 restart video-worker
```

---

*Готово! Система готова к тестированию 🚀*

