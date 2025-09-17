#!/bin/bash

echo "🔗 Исправление символических ссылок для HLS"
echo "========================================="

# Создаем символические ссылки для HLS файлов
echo "📁 Создание символических ссылок..."

# Создаем ссылку на основной HLS файл
if [ -f "/srv/streaming/live/main.m3u8" ]; then
    ln -sf /srv/streaming/live/main.m3u8 /srv/streaming/live/main/index.m3u8
    echo "✅ Создана ссылка: main.m3u8 -> main/index.m3u8"
else
    echo "⚠️  Файл main.m3u8 не найден"
fi

# Создаем ссылки на сегменты
for ts_file in /srv/streaming/live/main-*.ts; do
    if [ -f "$ts_file" ]; then
        filename=$(basename "$ts_file")
        ln -sf "$ts_file" "/srv/streaming/live/main/$filename"
        echo "✅ Создана ссылка: $filename -> main/$filename"
    fi
done

echo ""
echo "📊 Статус файлов:"
ls -la /srv/streaming/live/main/

echo ""
echo "🎯 Проверка API:"
curl -s "https://spoken-word.ru/api/stream-status?key=main" | jq . 2>/dev/null || echo "API недоступен"

echo ""
echo "🎯 Проверка HLS:"
curl -I "https://spoken-word.ru/live/main/index.m3u8" 2>/dev/null | head -1 || echo "HLS недоступен"

echo ""
echo "✅ Исправление ссылок завершено!"
