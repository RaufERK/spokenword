#!/bin/bash

# Скрипт для настройки автоматического бэкапа БД

echo "🔧 Настройка автоматического бэкапа базы данных..."

# Путь к проекту
PROJECT_PATH="/home/appuser/apps/spokenword/source"

# Создаем cron задачу (каждое воскресенье в 3:00 утра)
CRON_JOB="0 3 * * 0 cd $PROJECT_PATH && source ~/.nvm/nvm.sh && nvm use --lts && npm run db:backup >> /home/appuser/logs/backup.log 2>&1"

# Проверяем, есть ли уже такая задача
if crontab -l 2>/dev/null | grep -q "db:backup"; then
    echo "⚠️  Cron задача для бэкапа уже существует"
else
    # Добавляем новую cron задачу
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron задача добавлена: каждое воскресенье в 3:00"
fi

# Создаем папку для логов
mkdir -p /home/appuser/logs

# Создаем папку для бэкапов
mkdir -p /home/appuser/backups/spokenword

echo "📋 Текущие cron задачи:"
crontab -l

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📅 Расписание бэкапов:"
echo "   • Каждое воскресенье в 3:00 утра"
echo "   • Хранится 4 недели (28 дней)"
echo "   • Логи: /home/appuser/logs/backup.log"
echo ""
echo "🔧 Команды для ручного управления:"
echo "   npm run db:backup                           # Создать бэкап сейчас"
echo "   npm run db:restore /path/to/backup.json     # Восстановить из бэкапа"
echo ""
echo "📁 Бэкапы сохраняются в: /home/appuser/backups/spokenword/"
