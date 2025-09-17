#!/bin/bash

# Скрипт для исправления прав доступа к файлам стрима
# Решает проблему, когда приложение не может читать файлы стрима

echo "🔧 Исправление прав доступа к файлам стрима..."

# Проверяем, что мы на сервере
if [[ ! -d "/srv/streaming" ]]; then
    echo "❌ Скрипт должен запускаться на сервере с папкой /srv/streaming"
    exit 1
fi

# Исправляем права доступа
echo "📁 Устанавливаем права доступа для папок..."
sudo chmod -R 755 /srv/streaming/live/

echo "📄 Устанавливаем права доступа для файлов..."
sudo find /srv/streaming/live/ -name "*.m3u8" -exec chmod 644 {} \;
sudo find /srv/streaming/live/ -name "*.ts" -exec chmod 644 {} \;

echo "✅ Права доступа исправлены!"
echo ""
echo "🔍 Проверяем доступность API..."
curl -s "http://localhost:3005/api/stream-status?key=main" | jq '.'

echo ""
echo "🎯 Теперь API должен корректно определять статус стрима"
