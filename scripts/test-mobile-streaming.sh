#!/bin/bash

echo "📱 Тестирование стриминга для мобильных устройств"
echo "==============================================="

HLS_URL="https://spoken-word.ru/live/main/index.m3u8"
API_URL="https://spoken-word.ru/api/stream-status?key=main"

echo "🔍 Проверка доступности HLS потока..."
echo "URL: $HLS_URL"

# Проверяем HTTP статус
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HLS_URL")
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HLS файл доступен"
    
    # Проверяем содержимое
    echo "📄 Содержимое HLS файла:"
    curl -s "$HLS_URL" | head -10
    
    # Проверяем CORS заголовки
    echo ""
    echo "🌐 CORS заголовки:"
    curl -I "$HLS_URL" 2>/dev/null | grep -i "access-control" || echo "CORS заголовки отсутствуют"
    
    # Проверяем размер файла
    FILE_SIZE=$(curl -s "$HLS_URL" | wc -c)
    echo "📊 Размер файла: $FILE_SIZE байт"
    
    if [ "$FILE_SIZE" -lt 10 ]; then
        echo "⚠️  Файл слишком маленький - возможно стрим не активен"
    else
        echo "✅ Размер файла нормальный"
    fi
    
else
    echo "❌ HLS файл недоступен (HTTP $HTTP_STATUS)"
fi

echo ""
echo "🔌 Проверка API стрима..."
API_RESPONSE=$(curl -s "$API_URL")
echo "API Response: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"isLive":true'; then
    echo "✅ API показывает активный стрим"
else
    echo "❌ API показывает неактивный стрим"
fi

echo ""
echo "📱 Рекомендации для мобильных устройств:"
echo "1. Убедитесь, что CORS заголовки присутствуют"
echo "2. Проверьте, что HLS файл содержит сегменты видео"
echo "3. Убедитесь, что сегменты .ts файлы доступны"
echo "4. Проверьте консоль браузера на ошибки"

echo ""
echo "🔧 Если проблемы на мобильных:"
echo "1. Запустите: ./scripts/fix-streaming-permissions.sh"
echo "2. Проверьте логи nginx: sudo tail -f /var/log/nginx/spoken_word_error.log"
echo "3. Перезапустите nginx: sudo systemctl reload nginx"

echo ""
echo "✅ Тестирование завершено!"
