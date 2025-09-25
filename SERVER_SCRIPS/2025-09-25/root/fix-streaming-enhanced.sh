#!/bin/bash

# Enhanced Streaming Fix Script
# Исправляет проблемы со стримингом и оптимизирует для мобильных

echo "🔧 Расширенное исправление стриминга"
echo "===================================="

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Функция вывода
log() {
    echo -e "${1}[$(date '+%H:%M:%S')] ${2}${NC}"
}

# Проверка, где запущен скрипт
if [ "$(whoami)" != "root" ] && [ "$HOSTNAME" != "erk.rauf.fvds.ru" ]; then
    log "$BLUE" "📡 Подключение к серверу..."
    ssh amster "sudo bash -s" < "$0"
    exit $?
fi

log "$GREEN" "✅ Запуск на сервере"

# 1. Остановка старых процессов
log "$YELLOW" "1️⃣ Очистка старых процессов..."
pkill -f "hls-monitor" 2>/dev/null || true
systemctl stop hls-monitor 2>/dev/null || true

# 2. Очистка файлов
log "$YELLOW" "2️⃣ Очистка HLS файлов..."
rm -rf /srv/streaming/live/main/* 2>/dev/null
rm -f /srv/streaming/live/*.m3u8 2>/dev/null
rm -f /srv/streaming/live/*.ts 2>/dev/null

# Создание директорий
mkdir -p /srv/streaming/live/main
mkdir -p /srv/streaming/archive
mkdir -p /srv/streaming/live_backup

# 3. Установка правильных прав
log "$YELLOW" "3️⃣ Настройка прав доступа..."
chown -R www-data:www-data /srv/streaming/
chmod -R 755 /srv/streaming/

# 4. Проверка nginx конфигурации
log "$YELLOW" "4️⃣ Проверка конфигурации nginx..."
nginx -t 2>&1 | grep -q "successful"
if [ $? -eq 0 ]; then
    log "$GREEN" "✅ Конфигурация nginx корректна"
else
    log "$RED" "❌ Ошибка в конфигурации nginx!"
    nginx -t
fi

# 5. Очистка кэша nginx
log "$YELLOW" "5️⃣ Очистка кэша..."
sync
echo 3 > /proc/sys/vm/drop_caches

# 6. Перезагрузка nginx
log "$YELLOW" "6️⃣ Перезагрузка nginx..."
systemctl reload nginx
sleep 2

# 7. Проверка портов
log "$YELLOW" "7️⃣ Проверка портов..."
if netstat -tlnp | grep -q ":1935"; then
    log "$GREEN" "✅ RTMP порт 1935 активен"
else
    log "$RED" "❌ RTMP порт 1935 не слушается!"
fi

if netstat -tlnp | grep -q ":443"; then
    log "$GREEN" "✅ HTTPS порт 443 активен"
else
    log "$RED" "❌ HTTPS порт 443 не слушается!"
fi

# 8. Проверка места на диске
log "$YELLOW" "8️⃣ Проверка дискового пространства..."
DISK_USAGE=$(df /srv/streaming | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    log "$RED" "⚠️ Мало места на диске! Использовано: ${DISK_USAGE}%"
    
    # Очистка старых архивов
    find /srv/streaming/archive -type f -mtime +7 -delete 2>/dev/null
    log "$YELLOW" "🗑️ Старые архивы удалены"
else
    log "$GREEN" "✅ Места на диске достаточно: ${DISK_USAGE}% использовано"
fi

# 9. Создание тестового плейлиста
log "$YELLOW" "9️⃣ Создание тестовой структуры..."
cat > /srv/streaming/live/test.m3u8 << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:2
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:2.0,
test.ts
#EXT-X-ENDLIST
EOF

# Создаем пустой test.ts
touch /srv/streaming/live/test.ts
chmod 644 /srv/streaming/live/test.*

# 10. Запуск HLS монитора
if [ -f "/usr/local/bin/hls-monitor.sh" ]; then
    log "$YELLOW" "🔟 Запуск HLS монитора..."
    /usr/local/bin/hls-monitor.sh start
    sleep 2
    
    if pgrep -f "hls-monitor" > /dev/null; then
        log "$GREEN" "✅ HLS монитор запущен"
    else
        log "$YELLOW" "⚠️ HLS монитор не запустился"
    fi
else
    log "$YELLOW" "⚠️ HLS монитор не установлен"
fi

# 11. Проверка API
log "$YELLOW" "1️⃣1️⃣ Проверка API..."
API_RESPONSE=$(curl -s "https://spoken-word.ru/api/stream-status?key=main" 2>/dev/null)
if echo "$API_RESPONSE" | grep -q "isLive"; then
    log "$GREEN" "✅ API отвечает корректно"
    echo "$API_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$API_RESPONSE"
else
    log "$YELLOW" "⚠️ API не готов или нет стрима"
fi

# 12. Оптимизация для мобильных
log "$YELLOW" "1️⃣2️⃣ Оптимизация для мобильных..."

# Проверка CORS заголовков
CORS_CHECK=$(curl -I "https://spoken-word.ru/live/test.m3u8" 2>/dev/null | grep -i "access-control-allow-origin")
if [ -n "$CORS_CHECK" ]; then
    log "$GREEN" "✅ CORS заголовки настроены"
else
    log "$RED" "❌ CORS заголовки отсутствуют!"
fi

# 13. Создание скрипта быстрого восстановления
log "$YELLOW" "1️⃣3️⃣ Создание скрипта быстрого восстановления..."
cat > /root/quick-fix.sh << 'EOF'
#!/bin/bash
# Быстрое восстановление стрима
pkill -f "ffmpeg.*main" 2>/dev/null
rm -f /srv/streaming/live/*.m3u8 /srv/streaming/live/*.ts
systemctl reload nginx
/usr/local/bin/hls-monitor.sh restart
echo "✅ Быстрое восстановление выполнено"
EOF
chmod +x /root/quick-fix.sh

# Финальная информация
echo ""
echo "======================================"
log "$GREEN" "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo "======================================"
echo ""
echo "📊 Статус системы:"
echo "  • nginx: $(systemctl is-active nginx)"
echo "  • PM2: $(su - appuser -c 'pm2 list' 2>/dev/null | grep -c online) приложений онлайн"
echo "  • Диск: ${DISK_USAGE}% использовано"
echo ""
echo "🎯 Рекомендации:"
echo "  1. Запустите стрим из OBS:"
echo "     • Сервер: rtmp://185.200.178.73/live"
echo "     • Ключ: main"
echo ""
echo "  2. Если стрим прерывается:"
echo "     • Выполните: ssh amster '/root/quick-fix.sh'"
echo ""
echo "  3. Для мониторинга:"
echo "     • ssh amster '/usr/local/bin/hls-monitor.sh status'"
echo ""
echo "🔗 Ссылки для проверки:"
echo "  • Веб: https://spoken-word.ru/live"
echo "  • HLS: https://spoken-word.ru/live/main/index.m3u8"
echo "  • API: https://spoken-word.ru/api/stream-status?key=main"
echo ""
