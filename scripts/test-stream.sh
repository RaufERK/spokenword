#!/bin/bash

# Скрипт для тестирования стрима
# Запускает тестовый стрим на 30 секунд

echo "🎬 Запуск тестового стрима на 30 секунд..."
echo "📺 Стрим будет доступен по адресу: https://spoken-word.ru/live/main/index.m3u8"
echo "🌐 Плеер: https://spoken-word.ru/live"
echo ""

# Запускаем тестовый стрим
ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=30 \
       -c:v libx264 -preset veryfast -c:a aac \
       -f flv rtmp://185.200.178.73/live/main

echo ""
echo "✅ Тестовый стрим завершен!"
echo "📁 Проверьте файлы в /srv/streaming/live/main/"
