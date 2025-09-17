#!/bin/bash

echo "🔧 Исправление проблем со стримингом на spoken-word.ru"
echo "=================================================="

# Проверяем права доступа
echo "📁 Проверка и исправление прав доступа..."
sudo chmod -R 755 /srv/streaming/
sudo chown -R www-data:www-data /srv/streaming/
sudo find /srv/streaming/ -name "*.m3u8" -exec chmod 644 {} \;
sudo find /srv/streaming/ -name "*.ts" -exec chmod 644 {} \;

# Создаем необходимые директории
echo "📂 Создание необходимых директорий..."
sudo mkdir -p /srv/streaming/live/main
sudo mkdir -p /srv/streaming/archive
sudo chown -R www-data:www-data /srv/streaming/

# Проверяем конфигурацию nginx
echo "🌐 Проверка конфигурации nginx..."
if [ -f "/etc/nginx/sites-available/spoken-word.ru" ]; then
    echo "✅ Конфигурация nginx найдена"
    sudo nginx -t
    if [ $? -eq 0 ]; then
        echo "✅ Конфигурация nginx корректна"
    else
        echo "❌ Ошибка в конфигурации nginx"
        echo "📝 Рекомендуется использовать исправленную конфигурацию из проекта"
    fi
else
    echo "❌ Конфигурация nginx не найдена"
    echo "📝 Необходимо создать конфигурацию nginx"
fi

# Проверяем systemd сервисы
echo "⚙️ Проверка systemd сервисов..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущен"
else
    echo "❌ Nginx не запущен"
    echo "🚀 Запускаем nginx..."
    sudo systemctl start nginx
fi

# Проверяем RTMP модуль
echo "📡 Проверка RTMP модуля..."
if netstat -tlnp | grep -q ":1935"; then
    echo "✅ RTMP сервер слушает на порту 1935"
else
    echo "❌ RTMP сервер не слушает на порту 1935"
    echo "🔧 Перезапускаем nginx..."
    sudo systemctl restart nginx
fi

# Проверяем приложение Next.js
echo "🚀 Проверка приложения Next.js..."
if netstat -tlnp | grep -q ":3005"; then
    echo "✅ Приложение Next.js запущено на порту 3005"
else
    echo "❌ Приложение Next.js не запущено на порту 3005"
    echo "📝 Проверьте статус PM2: pm2 status"
fi

# Проверяем доступность HLS потока
echo "📺 Проверка HLS потока..."
if [ -f "/srv/streaming/live/main/index.m3u8" ]; then
    echo "✅ HLS файл существует"
    echo "📊 Размер файла: $(stat -c%s /srv/streaming/live/main/index.m3u8) байт"
    echo "🕒 Последнее изменение: $(stat -c%y /srv/streaming/live/main/index.m3u8)"
else
    echo "❌ HLS файл не найден"
    echo "📝 Создаем пустой файл для тестирования..."
    sudo touch /srv/streaming/live/main/index.m3u8
    sudo chown www-data:www-data /srv/streaming/live/main/index.m3u8
fi

# Проверяем API
echo "🔌 Проверка API стрима..."
API_RESPONSE=$(curl -s "https://spoken-word.ru/api/stream-status?key=main")
if echo "$API_RESPONSE" | grep -q "isLive"; then
    echo "✅ API стрима отвечает"
    echo "📊 Ответ API: $API_RESPONSE"
else
    echo "❌ API стрима не отвечает"
fi

echo ""
echo "🎯 Рекомендации:"
echo "1. Убедитесь, что используется правильная конфигурация nginx"
echo "2. Проверьте, что приложение запущено на порту 3005"
echo "3. Запустите стрим из OBS с параметрами:"
echo "   - Сервер: rtmp://185.200.178.73/live"
echo "   - Ключ: main"
echo "4. Проверьте логи: sudo tail -f /var/log/nginx/spoken_word_error.log"
echo ""
echo "✅ Диагностика завершена!"
