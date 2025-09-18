#!/bin/bash

# Stream Manager - Управление стримингом SpokenWord
# Центральный скрипт для всех операций со стримом

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Конфигурация
SERVER="amster"
RTMP_URL="rtmp://185.200.178.73/live"
STREAM_KEY="main"
WEB_URL="https://spoken-word.ru/live"
API_URL="https://spoken-word.ru/api/stream-status?key=main"
HLS_URL="https://spoken-word.ru/live/main/index.m3u8"

# Функция вывода
print_color() {
    echo -e "${1}${2}${NC}"
}

# Заголовок
show_header() {
    echo ""
    print_color "$CYAN" "╔════════════════════════════════════════╗"
    print_color "$CYAN" "║      SpokenWord Stream Manager        ║"
    print_color "$CYAN" "╚════════════════════════════════════════╝"
    echo ""
}

# Проверка статуса стрима
check_status() {
    show_header
    print_color "$YELLOW" "📊 Проверка статуса стрима..."
    echo ""
    
    # API статус
    local api_response=$(curl -s "$API_URL" 2>/dev/null)
    if echo "$api_response" | grep -q '"isLive":true'; then
        print_color "$GREEN" "✅ Стрим АКТИВЕН"
        echo "$api_response" | python3 -m json.tool 2>/dev/null || echo "$api_response"
    else
        print_color "$RED" "❌ Стрим НЕ АКТИВЕН"
        echo "$api_response" | python3 -m json.tool 2>/dev/null || echo "$api_response"
    fi
    
    echo ""
    # Проверка сервисов на сервере
    print_color "$YELLOW" "🔍 Проверка сервисов..."
    ssh $SERVER "sudo bash -c '
        echo -n \"  nginx: \"
        if systemctl is-active nginx > /dev/null; then
            echo \"✅ активен\"
        else
            echo \"❌ не активен\"
        fi
        
        echo -n \"  HLS монитор: \"
        if pgrep -f \"hls-monitor\" > /dev/null; then
            echo \"✅ работает\"
        else
            echo \"❌ не работает\"
        fi
        
        echo -n \"  Watchdog: \"
        if crontab -l | grep -q \"stream-watchdog\"; then
            echo \"✅ настроен\"
        else
            echo \"❌ не настроен\"
        fi
        
        echo -n \"  RTMP порт 1935: \"
        if netstat -tlnp | grep -q \":1935\"; then
            echo \"✅ слушается\"
        else
            echo \"❌ не слушается\"
        fi
        
        echo -n \"  HLS файлы: \"
        m3u8_count=\$(ls -1 /srv/streaming/live/*.m3u8 2>/dev/null | wc -l)
        ts_count=\$(ls -1 /srv/streaming/live/*.ts 2>/dev/null | wc -l)
        echo \"📁 m3u8: \$m3u8_count, ts: \$ts_count\"
    '"
}

# Быстрое исправление
quick_fix() {
    show_header
    print_color "$YELLOW" "🔧 Быстрое исправление стрима..."
    echo ""
    
    ssh $SERVER "sudo bash -c '
        # Очистка битых файлов
        find /srv/streaming/live/main -type l ! -exec test -e {} \; -delete 2>/dev/null
        
        # Права доступа
        chown -R www-data:www-data /srv/streaming/
        chmod -R 755 /srv/streaming/
        
        # Создание символических ссылок
        if [ -f /srv/streaming/live/main.m3u8 ]; then
            ln -sf /srv/streaming/live/main.m3u8 /srv/streaming/live/main/index.m3u8
        fi
        
        for ts_file in /srv/streaming/live/main-*.ts; do
            if [ -f \"\$ts_file\" ]; then
                filename=\$(basename \"\$ts_file\")
                ln -sf \"\$ts_file\" \"/srv/streaming/live/main/\${filename}\"
            fi
        done
        
        # Перезапуск HLS монитора
        /usr/local/bin/hls-monitor.sh restart > /dev/null 2>&1
        
        echo \"✅ Исправление завершено\"
    '"
    
    echo ""
    print_color "$GREEN" "✅ Готово!"
}

# Полное восстановление
full_recovery() {
    show_header
    print_color "$YELLOW" "♻️ Полное восстановление системы стриминга..."
    echo ""
    
    ssh $SERVER "sudo /root/fix-streaming-enhanced.sh"
    
    echo ""
    print_color "$GREEN" "✅ Система восстановлена!"
}

# Запуск мониторинга
start_monitoring() {
    show_header
    print_color "$YELLOW" "👁️ Запуск мониторинга стрима..."
    echo ""
    
    ssh $SERVER "sudo bash -c '
        # Запуск HLS монитора
        /usr/local/bin/hls-monitor.sh start
        
        # Проверка watchdog в cron
        if ! crontab -l | grep -q \"stream-watchdog\"; then
            (crontab -l 2>/dev/null; echo \"* * * * * /usr/local/bin/stream-watchdog.sh\") | crontab -
            echo \"✅ Watchdog добавлен в cron\"
        else
            echo \"✅ Watchdog уже в cron\"
        fi
        
        echo \"✅ Мониторинг запущен\"
    '"
}

# Остановка мониторинга
stop_monitoring() {
    show_header
    print_color "$YELLOW" "🛑 Остановка мониторинга..."
    echo ""
    
    ssh $SERVER "sudo bash -c '
        # Остановка HLS монитора
        /usr/local/bin/hls-monitor.sh stop
        
        # Удаление из cron
        crontab -l | grep -v \"stream-watchdog\" | crontab -
        
        echo \"✅ Мониторинг остановлен\"
    '"
}

# Очистка логов
clean_logs() {
    show_header
    print_color "$YELLOW" "🧹 Очистка логов..."
    echo ""
    
    ssh $SERVER "sudo bash -c '
        > /var/log/hls-monitor.log
        > /var/log/stream-watchdog.log
        > /var/log/nginx/spoken_word_error.log
        > /var/log/nginx/spoken_word_access.log
        echo \"✅ Логи очищены\"
    '"
}

# Показать логи
show_logs() {
    show_header
    print_color "$YELLOW" "📜 Последние записи логов..."
    echo ""
    
    print_color "$CYAN" "=== HLS Monitor ==="
    ssh $SERVER "sudo tail -5 /var/log/hls-monitor.log 2>/dev/null || echo 'Лог пуст'"
    
    echo ""
    print_color "$CYAN" "=== Stream Watchdog ==="
    ssh $SERVER "sudo tail -5 /var/log/stream-watchdog.log 2>/dev/null || echo 'Лог пуст'"
    
    echo ""
    print_color "$CYAN" "=== Nginx Errors ==="
    ssh $SERVER "sudo tail -5 /var/log/nginx/spoken_word_error.log 2>/dev/null | grep -v 'No such file' || echo 'Нет ошибок'"
}

# Информация для OBS
show_obs_info() {
    show_header
    print_color "$MAGENTA" "📹 Настройки для OBS Studio:"
    echo ""
    echo "  Сервер: $RTMP_URL"
    echo "  Ключ потока: $STREAM_KEY"
    echo ""
    print_color "$MAGENTA" "⚙️ Рекомендуемые настройки:"
    echo "  • Видеокодек: x264"
    echo "  • Битрейт: 2500-4000 Kbps"
    echo "  • Keyframe Interval: 2 секунды"
    echo "  • Аудиокодек: AAC"
    echo "  • Аудио битрейт: 128 Kbps"
    echo "  • Разрешение: 1920x1080 или 1280x720"
    echo "  • FPS: 30"
}

# Тестовые ссылки
show_links() {
    show_header
    print_color "$BLUE" "🔗 Ссылки для проверки:"
    echo ""
    echo "  Веб-интерфейс: $WEB_URL"
    echo "  API статус: $API_URL"
    echo "  HLS плейлист: $HLS_URL"
    echo ""
    print_color "$BLUE" "📱 QR-код для мобильных:"
    echo "  Откройте $WEB_URL на мобильном устройстве"
}

# Помощь
show_help() {
    show_header
    print_color "$GREEN" "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  status          - Проверить статус стрима"
    echo "  fix             - Быстрое исправление проблем"
    echo "  recovery        - Полное восстановление системы"
    echo "  monitor-start   - Запустить мониторинг"
    echo "  monitor-stop    - Остановить мониторинг"
    echo "  logs            - Показать последние логи"
    echo "  clean-logs      - Очистить логи"
    echo "  obs             - Показать настройки для OBS"
    echo "  links           - Показать ссылки для проверки"
    echo "  help            - Показать эту справку"
    echo ""
    echo "Быстрые команды:"
    echo "  npm run stream:status   - Проверить статус"
    echo "  npm run stream:fix      - Быстрое исправление"
    echo "  npm run stream:recovery - Полное восстановление"
}

# Основная логика
case "$1" in
    status)
        check_status
        ;;
    fix)
        quick_fix
        ;;
    recovery)
        full_recovery
        ;;
    monitor-start)
        start_monitoring
        ;;
    monitor-stop)
        stop_monitoring
        ;;
    logs)
        show_logs
        ;;
    clean-logs)
        clean_logs
        ;;
    obs)
        show_obs_info
        ;;
    links)
        show_links
        ;;
    help|"")
        show_help
        ;;
    *)
        print_color "$RED" "❌ Неизвестная команда: $1"
        show_help
        exit 1
        ;;
esac

echo ""
