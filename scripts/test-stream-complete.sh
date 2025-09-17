#!/bin/bash

echo "🎬 Полное тестирование стриминга на spoken-word.ru"
echo "================================================"

# Параметры тестирования
DURATION=30
RTMP_SERVER="rtmp://185.200.178.73/live"
STREAM_KEY="main"
HLS_URL="https://spoken-word.ru/live/main/index.m3u8"
API_URL="https://spoken-word.ru/api/stream-status?key=main"

echo "📋 Параметры тестирования:"
echo "   Длительность: ${DURATION} секунд"
echo "   RTMP сервер: $RTMP_SERVER"
echo "   Ключ потока: $STREAM_KEY"
echo "   HLS URL: $HLS_URL"
echo ""

# Проверяем доступность RTMP сервера
echo "🔍 Проверка доступности RTMP сервера..."
if nc -zv 185.200.178.73 1935 2>/dev/null; then
    echo "✅ RTMP сервер доступен"
else
    echo "❌ RTMP сервер недоступен"
    exit 1
fi

# Проверяем API перед тестом
echo "🔌 Проверка API перед тестом..."
API_BEFORE=$(curl -s "$API_URL")
echo "📊 API до теста: $API_BEFORE"

# Запускаем тестовый стрим в фоне
echo "🚀 Запуск тестового стрима..."
ffmpeg -f lavfi -i testsrc=duration=$DURATION:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=$DURATION \
       -c:v libx264 -preset veryfast -profile:v baseline -level 3.0 \
       -c:a aac -ar 44100 -ac 2 -b:a 128k \
       -f flv "${RTMP_SERVER}/${STREAM_KEY}" &
FFMPEG_PID=$!

echo "⏳ Ожидание начала стрима (10 секунд)..."
sleep 10

# Проверяем API во время стрима
echo "🔌 Проверка API во время стрима..."
for i in {1..3}; do
    API_DURING=$(curl -s "$API_URL")
    echo "📊 API во время стрима (попытка $i): $API_DURING"
    sleep 5
done

# Проверяем HLS файл
echo "📺 Проверка HLS файла..."
if curl -I "$HLS_URL" 2>/dev/null | grep -q "200 OK"; then
    echo "✅ HLS файл доступен"
else
    echo "❌ HLS файл недоступен"
fi

# Ждем завершения стрима
echo "⏳ Ожидание завершения стрима..."
wait $FFMPEG_PID

# Проверяем API после теста
echo "🔌 Проверка API после теста..."
sleep 5
API_AFTER=$(curl -s "$API_URL")
echo "📊 API после теста: $API_AFTER"

echo ""
echo "🎯 Результаты тестирования:"
echo "=========================="

# Анализируем результаты
if echo "$API_DURING" | grep -q '"isLive":true'; then
    echo "✅ Стрим успешно детектировался API"
else
    echo "❌ Стрим не детектировался API"
fi

if curl -I "$HLS_URL" 2>/dev/null | grep -q "200 OK"; then
    echo "✅ HLS файл создавался"
else
    echo "❌ HLS файл не создавался"
fi

echo ""
echo "📝 Рекомендации:"
echo "1. Проверьте логи nginx: sudo tail -f /var/log/nginx/spoken_word_error.log"
echo "2. Проверьте логи ffmpeg: sudo tail -f /srv/streaming/live/main/ffmpeg.log"
echo "3. Проверьте статус systemd сервисов: sudo systemctl status hls-worker@main.service"
echo "4. Убедитесь, что используется правильная конфигурация nginx"
echo ""
echo "✅ Тестирование завершено!"
