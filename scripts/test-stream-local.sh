#!/bin/bash

# Скрипт для тестирования стрима с локальной машины
# Требует установки ffmpeg

echo "🎬 Тестирование стрима с локальной машины..."
echo "📺 Стрим будет доступен по адресу: https://spoken-word.ru/live/main/index.m3u8"
echo "🌐 Плеер: https://spoken-word.ru/live"
echo ""

# Проверяем доступность ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg не найден. Установите ffmpeg для тестирования."
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt install ffmpeg"
    exit 1
fi

# Проверяем доступность RTMP сервера
echo "🔍 Проверяем доступность RTMP сервера..."
if ! nc -z 185.200.178.73 1935; then
    echo "❌ RTMP сервер недоступен на порту 1935"
    exit 1
fi

echo "✅ RTMP сервер доступен"
echo ""

# Запускаем тестовый стрим
echo "🚀 Запуск тестового стрима на 30 секунд..."
echo "   Нажмите Ctrl+C для остановки"

ffmpeg -f lavfi -i testsrc=duration=30:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=1000:duration=30 \
       -c:v libx264 -preset veryfast -c:a aac \
       -f flv rtmp://185.200.178.73/live/main

echo ""
echo "✅ Тестовый стрим завершен!"
echo "🌐 Проверьте плеер: https://spoken-word.ru/live"
