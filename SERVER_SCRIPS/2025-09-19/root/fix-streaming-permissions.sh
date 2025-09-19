#!/bin/bash

echo "🔧 Быстрое восстановление прав доступа к файлам стриминга"
echo "======================================================"

# Проверяем, запущен ли скрипт на сервере
if [ "$(whoami)" = "appuser" ]; then
    echo "📡 Запуск на сервере через sudo..."
    sudo bash -c '
        echo "📁 Создание необходимых директорий..."
        mkdir -p /srv/streaming/live/main
        mkdir -p /srv/streaming/archive
        
        echo "🔐 Установка правильных прав доступа..."
        chown -R www-data:www-data /srv/streaming/
        chmod -R 755 /srv/streaming/
        
        echo "📄 Установка прав для файлов..."
        find /srv/streaming/ -name "*.m3u8" -exec chmod 644 {} \; 2>/dev/null || true
        find /srv/streaming/ -name "*.ts" -exec chmod 644 {} \; 2>/dev/null || true
        
        echo "✅ Права доступа восстановлены!"
        echo "📊 Статус директорий:"
        ls -la /srv/streaming/
        ls -la /srv/streaming/live/ 2>/dev/null || echo "Папка live не найдена"
        ls -la /srv/streaming/live/main/ 2>/dev/null || echo "Папка main не найдена"
    '
elif [ "$(whoami)" = "root" ]; then
    echo "📡 Запуск от root..."
    echo "📁 Создание необходимых директорий..."
    mkdir -p /srv/streaming/live/main
    mkdir -p /srv/streaming/archive
    
    echo "🔐 Установка правильных прав доступа..."
    chown -R www-data:www-data /srv/streaming/
    chmod -R 755 /srv/streaming/
    
    echo "📄 Установка прав для файлов..."
    find /srv/streaming/ -name "*.m3u8" -exec chmod 644 {} \; 2>/dev/null || true
    find /srv/streaming/ -name "*.ts" -exec chmod 644 {} \; 2>/dev/null || true
    
    echo "✅ Права доступа восстановлены!"
    echo "📊 Статус директорий:"
    ls -la /srv/streaming/
    ls -la /srv/streaming/live/ 2>/dev/null || echo "Папка live не найдена"
    ls -la /srv/streaming/live/main/ 2>/dev/null || echo "Папка main не найдена"
else
    echo "📡 Запуск через SSH..."
    ssh amster_app "bash -s" < "$0"
fi

echo ""
echo "🎯 Проверка API стрима:"
curl -s "https://spoken-word.ru/api/stream-status?key=main" | jq . 2>/dev/null || echo "API недоступен"

echo ""
echo "🎯 Проверка HLS файла:"
curl -I "https://spoken-word.ru/live/main/index.m3u8" 2>/dev/null | head -1 || echo "HLS файл недоступен"

echo ""
echo "✅ Восстановление завершено!"
echo "🎬 Теперь можете запускать стрим из OBS Studio!"

# Создание символических ссылок для HLS
echo "🔗 Создание символических ссылок для HLS..."
if [ -f "/srv/streaming/live/main.m3u8" ]; then
    ln -sf /srv/streaming/live/main.m3u8 /srv/streaming/live/main/index.m3u8
    echo "✅ Создана ссылка: main.m3u8 -> main/index.m3u8"
fi

# Создаем ссылки на сегменты
for ts_file in /srv/streaming/live/main-*.ts; do
    if [ -f "$ts_file" ]; then
        filename=$(basename "$ts_file")
        ln -sf "$ts_file" "/srv/streaming/live/main/$filename"
    fi
done

# Создание символических ссылок для HLS
echo "🔗 Создание символических ссылок для HLS..."
if [ -f "/srv/streaming/live/main.m3u8" ]; then
    ln -sf /srv/streaming/live/main.m3u8 /srv/streaming/live/main/index.m3u8
    echo "✅ Создана ссылка: main.m3u8 -> main/index.m3u8"
fi

# Создаем ссылки на сегменты
for ts_file in /srv/streaming/live/main-*.ts; do
    if [ -f "$ts_file" ]; then
        filename=$(basename "$ts_file")
        ln -sf "$ts_file" "/srv/streaming/live/main/$filename"
    fi
done
