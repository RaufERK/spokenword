#!/bin/bash

# Скрипт для исправления проблем с HLS воспроизведением
# Решает проблемы с CORS, правами доступа и конфигурацией nginx

echo "🔧 Исправление проблем с HLS воспроизведением..."

# Проверяем, что мы на сервере
if [[ ! -d "/srv/streaming" ]]; then
    echo "❌ Скрипт должен запускаться на сервере с папкой /srv/streaming"
    exit 1
fi

echo "📁 Исправляем права доступа к файлам стрима..."
sudo chmod -R 755 /srv/streaming/live/
sudo find /srv/streaming/live/ -name "*.m3u8" -exec chmod 644 {} \;
sudo find /srv/streaming/live/ -name "*.ts" -exec chmod 644 {} \;

echo "🌐 Проверяем конфигурацию nginx..."
if ! grep -q "access-control-allow-origin" /etc/nginx/sites-available/spoken-word.ru; then
    echo "⚠️  CORS заголовки не найдены в конфигурации nginx"
    echo "📝 Добавляем CORS заголовки..."
    
    # Создаем резервную копию
    sudo cp /etc/nginx/sites-available/spoken-word.ru /etc/nginx/sites-available/spoken-word.ru.backup.$(date +%Y%m%d_%H%M%S)
    
    # Добавляем CORS заголовки
    sudo sed -i '/location \/live\/ {/,/}/ {
        /add_header Cache-Control "no-cache";/a\
        add_header Access-Control-Allow-Origin "*";\
        add_header Access-Control-Allow-Methods "GET, OPTIONS";\
        add_header Access-Control-Allow-Headers "Range";
    }' /etc/nginx/sites-available/spoken-word.ru
    
    echo "🔄 Перезагружаем nginx..."
    sudo nginx -t && sudo systemctl reload nginx
else
    echo "✅ CORS заголовки уже настроены"
fi

echo "🔍 Проверяем доступность HLS потока..."
if curl -s -I https://spoken-word.ru/live/main/index.m3u8 | grep -q "access-control-allow-origin"; then
    echo "✅ HLS поток доступен с CORS заголовками"
else
    echo "❌ Проблема с доступностью HLS потока"
fi

echo "🔍 Проверяем API..."
API_RESPONSE=$(curl -s "http://localhost:3005/api/stream-status?key=main")
echo "📊 API ответ: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"isLive":true'; then
    echo "✅ API корректно определяет активный стрим"
else
    echo "⚠️  API не определяет активный стрим"
fi

echo ""
echo "🎯 Исправления завершены!"
echo "🌐 Проверьте плеер: https://spoken-word.ru/live"
echo "📺 HLS поток: https://spoken-word.ru/live/main/index.m3u8"
