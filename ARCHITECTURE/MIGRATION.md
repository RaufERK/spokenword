# 🚀 Миграция данных SPOKENWORD на новый сервер

## 📋 Пошаговая инструкция

### 1. На СТАРОМ сервере (экспорт данных)

```bash
# Перейти в директорию проекта
cd /var/www/spokenword/current

# Экспортировать все данные из базы
npm run db:export
```

Команда создаст файл вида `database-export-2025-09-10.json` с полным дампом всех таблиц.

### 2. Скопировать файл экспорта на новый сервер

```bash
# Скопировать файл экспорта
scp database-export-*.json appuser@185.200.178.73:/home/appuser/apps/spokenword/
```

### 3. На НОВОМ сервере (импорт данных)

```bash
# Перейти в директорию проекта
cd /home/appuser/apps/spokenword

# Создать базу данных и применить миграции
npx prisma migrate deploy

# Импортировать данные (укажите реальное имя файла)
npm run seed database-export-2025-09-10.json
```

## 🔧 Что экспортируется/импортируется

### ✅ Данные которые сохраняются:
- **Пользователи** (`User`) - включая данные об оплате (`paymentDate`)
- **Файлы конференций** (`ConferenceFile`) - метаданные загруженных файлов
- **Ссылки стримов** (`StreamLink`) - активные ссылки для стрима

### ⚠️ Важные моменты:
- **Медиафайлы** (`.mp4`) нужно копировать отдельно из `public/conf-archive/`
- **Архивные файлы** в `public/archive/` также копировать отдельно
- База данных **НЕ коммитится** в git (исключена в `.gitignore`)

## 🛠️ Ручные команды (если нужно)

### Экспорт данных вручную:
```bash
node scripts/export-data.js
```

### Импорт с указанием файла:
```bash
node prisma/seed.js database-export-2025-09-10.json
```

### Создание только админа (без импорта):
```bash
node prisma/seed.js
```

## 📊 Проверка успешности миграции

После импорта проверьте:

```bash
# Открыть Prisma Studio для просмотра данных
npm run dblist
```

Или подключиться к приложению и проверить:
- Вход под учётными данными пользователей
- Корректность данных об оплате
- Доступность файлов конференций

## 🔄 В случае проблем

### Очистка базы и повторный импорт:
```bash
# Удалить базу
rm prisma/data.db

# Пересоздать базу
npx prisma migrate deploy

# Повторный импорт
npm run seed database-export-YYYY-MM-DD.json
```

### Копирование медиафайлов:
```bash
# Копирование файлов конференций
scp -r old-server:/var/www/spokenword/current/public/conf-archive/*.mp4 /home/appuser/apps/spokenword/public/conf-archive/

# Копирование архивных файлов  
scp -r old-server:/var/www/spokenword/current/public/archive/*.mp4 /home/appuser/apps/spokenword/public/archive/
```
