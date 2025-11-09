#!/bin/bash

echo "🔧 Исправление сжатия видео на сервере..."

# Проверяем что мы на сервере
if [ ! -d "/home/appuser" ]; then
    echo "❌ Этот скрипт только для сервера!"
    exit 1
fi

cd /home/appuser/apps/spokenword/source

echo "📊 Проверяем память сервера..."
free -h

echo ""
echo "🗑️ Чистим temp файлы..."
rm -f /home/appuser/apps/spokenword/source/paid-content/temp/*
echo "✅ Temp очищен"

echo ""
echo "📋 Проверяем очередь Redis..."
redis-cli LLEN bull:video-compression:wait
redis-cli LLEN bull:video-compression:active

echo ""
echo "🔄 Перезапускаем worker..."
pm2 restart video-worker

echo ""
echo "📊 Статус процессов:"
pm2 list

echo ""
echo "📝 Логи worker (последние 20 строк):"
pm2 logs video-worker --lines 20 --nostream

echo ""
echo "✅ Готово!"
echo ""
echo "Теперь попробуй загрузить файл снова."
echo "Следи за логами: pm2 logs video-worker"

