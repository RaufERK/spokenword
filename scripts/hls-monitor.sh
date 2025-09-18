#!/bin/bash

# HLS Monitor - автоматическое создание символических ссылок и мониторинг стрима

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

HLS_PATH="/srv/streaming/live"
MAIN_DIR="${HLS_PATH}/main"
LOG_FILE="/var/log/hls-monitor.log"
PID_FILE="/var/run/hls-monitor.pid"

# Функция логирования
log() {
    echo -e "${1}${2}${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $2" >> $LOG_FILE
}

# Создание символической ссылки для плейлиста
create_playlist_link() {
    if [ -f "${HLS_PATH}/main.m3u8" ]; then
        # Создаем символическую ссылку для index.m3u8
        ln -sf "${HLS_PATH}/main.m3u8" "${MAIN_DIR}/index.m3u8"
        
        # Также создаем копию main.m3u8 в папке main для совместимости
        ln -sf "${HLS_PATH}/main.m3u8" "${MAIN_DIR}/main.m3u8"
        
        log "$GREEN" "✅ Плейлист связан"
        return 0
    fi
    return 1
}

# Создание символических ссылок для сегментов
create_segment_links() {
    local created=0
    
    # Находим все .ts файлы в корневой директории
    for ts_file in ${HLS_PATH}/main-*.ts; do
        if [ -f "$ts_file" ]; then
            filename=$(basename "$ts_file")
            target="${MAIN_DIR}/${filename}"
            
            # Создаем символическую ссылку если её нет
            if [ ! -L "$target" ] || [ ! -e "$target" ]; then
                ln -sf "$ts_file" "$target"
                created=$((created + 1))
            fi
        fi
    done
    
    if [ $created -gt 0 ]; then
        log "$GREEN" "✅ Создано $created новых ссылок на сегменты"
    fi
    
    return $created
}

# Очистка старых символических ссылок
cleanup_old_links() {
    local cleaned=0
    
    # Удаляем битые символические ссылки
    for link in ${MAIN_DIR}/*.ts; do
        if [ -L "$link" ] && [ ! -e "$link" ]; then
            rm -f "$link"
            cleaned=$((cleaned + 1))
        fi
    done
    
    if [ $cleaned -gt 0 ]; then
        log "$YELLOW" "🧹 Удалено $cleaned битых ссылок"
    fi
}

# Проверка статуса стрима
check_stream_status() {
    # Проверяем, обновляется ли плейлист
    if [ -f "${HLS_PATH}/main.m3u8" ]; then
        local age=$(( $(date +%s) - $(stat -c %Y "${HLS_PATH}/main.m3u8" 2>/dev/null || echo 0) ))
        
        if [ $age -lt 10 ]; then
            return 0  # Стрим активен
        elif [ $age -lt 60 ]; then
            return 1  # Стрим приостановлен
        else
            return 2  # Стрим неактивен
        fi
    fi
    return 3  # Нет стрима
}

# Исправление прав доступа
fix_permissions() {
    chown -R www-data:www-data ${HLS_PATH}/
    chmod -R 755 ${HLS_PATH}/
    find ${HLS_PATH}/ -name "*.m3u8" -exec chmod 644 {} \; 2>/dev/null
    find ${HLS_PATH}/ -name "*.ts" -exec chmod 644 {} \; 2>/dev/null
}

# Основной цикл мониторинга
monitor_loop() {
    log "$GREEN" "🚀 HLS Monitor запущен"
    
    # Сохраняем PID
    echo $$ > $PID_FILE
    
    # Первоначальная настройка
    mkdir -p ${MAIN_DIR}
    fix_permissions
    
    local last_status=3
    local error_count=0
    
    while true; do
        check_stream_status
        status=$?
        
        case $status in
            0)  # Стрим активен
                if [ $last_status -ne 0 ]; then
                    log "$GREEN" "📺 Стрим активен!"
                    error_count=0
                fi
                
                create_playlist_link
                create_segment_links
                cleanup_old_links
                ;;
                
            1)  # Стрим приостановлен
                if [ $last_status -eq 0 ]; then
                    log "$YELLOW" "⏸️ Стрим приостановлен"
                fi
                
                # Пытаемся восстановить
                create_playlist_link
                create_segment_links
                ;;
                
            2)  # Стрим неактивен
                if [ $last_status -lt 2 ]; then
                    log "$RED" "⚠️ Стрим неактивен более 60 секунд"
                    
                    # Попытка восстановления
                    fix_permissions
                    error_count=$((error_count + 1))
                    
                    if [ $error_count -gt 3 ]; then
                        log "$RED" "❌ Множественные ошибки, перезапуск nginx RTMP..."
                        # Перезапускаем только RTMP часть
                        nginx -s reload
                        error_count=0
                    fi
                fi
                ;;
                
            3)  # Нет стрима
                if [ $last_status -ne 3 ]; then
                    log "$YELLOW" "💤 Ожидание стрима..."
                fi
                ;;
        esac
        
        last_status=$status
        
        # Проверка каждые 2 секунды
        sleep 2
        
        # Периодическая проверка прав (каждые 30 итераций = 1 минута)
        if [ $((SECONDS % 60)) -eq 0 ]; then
            fix_permissions
        fi
    done
}

# Остановка монитора
stop_monitor() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat $PID_FILE)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            rm -f $PID_FILE
            log "$YELLOW" "🛑 HLS Monitor остановлен"
        else
            log "$RED" "⚠️ Процесс не найден"
        fi
    else
        log "$RED" "⚠️ PID файл не найден"
    fi
}

# Статус монитора
status_monitor() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat $PID_FILE)
        if kill -0 $PID 2>/dev/null; then
            log "$GREEN" "✅ HLS Monitor работает (PID: $PID)"
            
            # Показываем статус стрима
            check_stream_status
            case $? in
                0) log "$GREEN" "📺 Стрим активен" ;;
                1) log "$YELLOW" "⏸️ Стрим приостановлен" ;;
                2) log "$RED" "⚠️ Стрим неактивен" ;;
                3) log "$YELLOW" "💤 Нет стрима" ;;
            esac
            
            # Показываем количество файлов
            if [ -d "$MAIN_DIR" ]; then
                local segments=$(ls -1 ${MAIN_DIR}/*.ts 2>/dev/null | wc -l)
                log "$GREEN" "📁 Сегментов: $segments"
            fi
        else
            log "$RED" "❌ HLS Monitor не работает"
        fi
    else
        log "$RED" "❌ HLS Monitor не запущен"
    fi
}

# Обработка аргументов
case "$1" in
    start)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat $PID_FILE)
            if kill -0 $PID 2>/dev/null; then
                log "$YELLOW" "⚠️ HLS Monitor уже работает"
                exit 1
            fi
        fi
        
        # Запуск в фоне
        nohup $0 monitor > /dev/null 2>&1 &
        sleep 1
        status_monitor
        ;;
        
    stop)
        stop_monitor
        ;;
        
    restart)
        stop_monitor
        sleep 2
        $0 start
        ;;
        
    status)
        status_monitor
        ;;
        
    monitor)
        monitor_loop
        ;;
        
    fix)
        # Быстрое исправление
        log "$YELLOW" "🔧 Быстрое исправление..."
        mkdir -p ${MAIN_DIR}
        fix_permissions
        create_playlist_link
        create_segment_links
        cleanup_old_links
        log "$GREEN" "✅ Исправление завершено"
        ;;
        
    *)
        echo "Использование: $0 {start|stop|restart|status|fix}"
        echo ""
        echo "  start   - Запустить монитор в фоне"
        echo "  stop    - Остановить монитор"
        echo "  restart - Перезапустить монитор"
        echo "  status  - Показать статус"
        echo "  fix     - Быстрое исправление файлов"
        exit 1
        ;;
esac

exit 0
