#!/bin/bash

echo "🔧 Восстановление прав доступа к файлам стриминга"
echo "======================================================"

if [ "$(whoami)" = "appuser" ]; then
    echo "📡 Запуск на сервере через sudo..."
    sudo bash -c '
        echo "📁 Создание необходимых директорий..."
        mkdir -p /srv/streaming/live/main
        mkdir -p /srv/streaming/archive
        
        echo "🔐 Установка правильных прав доступа..."
        chown -R www-data:www-data /srv/streaming/
        chmod -R 755 /srv/streaming/
        
        echo "✅ Права доступа восстановлены!"
        echo "📊 Статус директорий:"
        ls -la /srv/streaming/live/main/ 2>/dev/null || echo "Папка main пуста"
    '
elif [ "$(whoami)" = "root" ]; then
    echo "📡 Запуск от root..."
    echo "📁 Создание необходимых директорий..."
    mkdir -p /srv/streaming/live/main
    mkdir -p /srv/streaming/archive
    
    echo "🔐 Установка правильных прав доступа..."
    chown -R www-data:www-data /srv/streaming/
    chmod -R 755 /srv/streaming/
    
    echo "✅ Права доступа восстановлены!"
    echo "📊 Статус директорий:"
    ls -la /srv/streaming/live/main/ 2>/dev/null || echo "Папка main пуста"
else
    echo "📡 Запуск через SSH..."
    ssh amster_app "bash -s" < "$0"
fi

echo ""
echo "✅ Восстановление завершено!"
echo "🎬 Теперь можете запускать стрим из OBS Studio!"
