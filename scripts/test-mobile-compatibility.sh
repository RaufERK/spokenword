#!/bin/bash

# Скрипт для тестирования мобильной совместимости HLS стрима

echo "📱 Тестирование мобильной совместимости HLS стрима..."

# Проверяем, что мы на сервере
if [[ ! -d "/srv/streaming" ]]; then
    echo "❌ Скрипт должен запускаться на сервере с папкой /srv/streaming"
    exit 1
fi

echo "🔍 Проверяем статус стрима..."
API_RESPONSE=$(curl -s "http://localhost:3005/api/stream-status?key=main")
echo "📊 API ответ: $API_RESPONSE"

if ! echo "$API_RESPONSE" | grep -q '"isLive":true'; then
    echo "⚠️  Стрим не активен. Запускаем тестовый стрим..."
    nohup ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000 -c:v libx264 -preset veryfast -c:a aac -f flv rtmp://185.200.178.73/live/main > /tmp/stream-test.log 2>&1 &
    echo "⏳ Ждем 10 секунд для запуска стрима..."
    sleep 10
fi

echo ""
echo "🧪 Тестируем различные User-Agent..."

# iPhone Safari
echo "📱 iPhone Safari:"
curl -s -I -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1" https://spoken-word.ru/live/main/index.m3u8 | grep -E "(HTTP|content-type|access-control)"

echo ""
echo "📱 Android Chrome:"
curl -s -I -H "User-Agent: Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36" https://spoken-word.ru/live/main/index.m3u8 | grep -E "(HTTP|content-type|access-control)"

echo ""
echo "📱 iPad Safari:"
curl -s -I -H "User-Agent: Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1" https://spoken-word.ru/live/main/index.m3u8 | grep -E "(HTTP|content-type|access-control)"

echo ""
echo "🔍 Проверяем HLS playlist..."
curl -s https://spoken-word.ru/live/main/index.m3u8 | head -10

echo ""
echo "🔍 Проверяем доступность сегмента..."
SEGMENT=$(curl -s https://spoken-word.ru/live/main/index.m3u8 | grep -E "\.ts$" | head -1 | tr -d '\r\n')
if [[ -n "$SEGMENT" ]]; then
    echo "📺 Тестируем сегмент: $SEGMENT"
    curl -s -I "https://spoken-word.ru/live/main/$SEGMENT" | grep -E "(HTTP|content-type|access-control|content-length)"
else
    echo "❌ Не удалось найти сегменты в playlist"
fi

echo ""
echo "🌐 Тестируем OPTIONS запрос (CORS preflight):"
curl -s -I -X OPTIONS -H "Origin: https://example.com" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Range" https://spoken-word.ru/live/main/index.m3u8 | grep -E "(HTTP|access-control)"

echo ""
echo "✅ Тестирование завершено!"
echo "🌐 Проверьте плеер на мобильном: https://spoken-word.ru/live"
echo "📺 Прямая ссылка: https://spoken-word.ru/live/main/index.m3u8"
