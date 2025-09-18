#!/bin/bash

# Stream Watchdog - автоматическое восстановление стрима
# Запускается через cron каждую минуту

LOG_FILE="/var/log/stream-watchdog.log"
STATE_FILE="/var/run/stream-watchdog.state"
ERROR_COUNT_FILE="/var/run/stream-watchdog.errors"
MAX_ERRORS=5
STREAM_URL="https://spoken-word.ru/api/stream-status?key=main"

# Функция логирования
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Получение количества ошибок
get_error_count() {
    if [ -f "$ERROR_COUNT_FILE" ]; then
        cat "$ERROR_COUNT_FILE"
    else
        echo "0"
    fi
}

# Увеличение счетчика ошибок
increment_errors() {
    local count=$(get_error_count)
    count=$((count + 1))
    echo $count > "$ERROR_COUNT_FILE"
    echo $count
}

# Сброс счетчика ошибок
reset_errors() {
    echo "0" > "$ERROR_COUNT_FILE"
}

# Проверка статуса стрима
check_stream() {
    # Проверяем через API
    local response=$(curl -s --max-time 5 "$STREAM_URL" 2>/dev/null)
    
    if echo "$response" | grep -q '"isLive":true'; then
        return 0  # Стрим активен
    fi
    
    # Альтернативная проверка - наличие m3u8 файла
    if [ -f "/srv/streaming/live/main.m3u8" ]; then
        local age=$(( $(date +%s) - $(stat -c %Y "/srv/streaming/live/main.m3u8" 2>/dev/null || echo 0) ))
        if [ $age -lt 30 ]; then
            return 0  # Файл свежий, стрим вероятно активен
        fi
    fi
    
    return 1  # Стрим не активен
}

# Проверка HLS файлов
check_hls_files() {
    local m3u8_count=$(ls -1 /srv/streaming/live/*.m3u8 2>/dev/null | wc -l)
    local ts_count=$(ls -1 /srv/streaming/live/*.ts 2>/dev/null | wc -l)
    
    if [ $m3u8_count -gt 0 ] && [ $ts_count -gt 0 ]; then
        return 0  # Файлы есть
    fi
    
    return 1  # Файлов нет или недостаточно
}

# Проверка символических ссылок
check_symlinks() {
    if [ ! -L "/srv/streaming/live/main/index.m3u8" ]; then
        # Создаем ссылку если её нет
        if [ -f "/srv/streaming/live/main.m3u8" ]; then
            ln -sf "/srv/streaming/live/main.m3u8" "/srv/streaming/live/main/index.m3u8"
            log_message "INFO: Создана символическая ссылка для index.m3u8"
        fi
    fi
    
    # Создаем ссылки для .ts файлов
    for ts_file in /srv/streaming/live/main-*.ts; do
        if [ -f "$ts_file" ]; then
            filename=$(basename "$ts_file")
            target="/srv/streaming/live/main/${filename}"
            if [ ! -L "$target" ]; then
                ln -sf "$ts_file" "$target"
            fi
        fi
    done
}

# Мягкое восстановление
soft_recovery() {
    log_message "WARNING: Попытка мягкого восстановления..."
    
    # Проверяем и исправляем права доступа
    chown -R www-data:www-data /srv/streaming/
    chmod -R 755 /srv/streaming/
    
    # Проверяем символические ссылки
    check_symlinks
    
    # Проверяем HLS монитор
    if ! pgrep -f "hls-monitor" > /dev/null; then
        /usr/local/bin/hls-monitor.sh start
        log_message "INFO: HLS монитор перезапущен"
    fi
}

# Жесткое восстановление
hard_recovery() {
    log_message "ERROR: Выполнение жесткого восстановления..."
    
    # Очистка старых файлов
    rm -rf /srv/streaming/live/*.m3u8
    rm -rf /srv/streaming/live/*.ts
    rm -rf /srv/streaming/live/main/*
    
    # Создание директорий
    mkdir -p /srv/streaming/live/main
    chown -R www-data:www-data /srv/streaming/
    chmod -R 755 /srv/streaming/
    
    # Перезагрузка nginx
    systemctl reload nginx
    
    # Перезапуск HLS монитора
    /usr/local/bin/hls-monitor.sh restart
    
    log_message "INFO: Жесткое восстановление завершено"
}

# Основная логика
main() {
    # Проверяем, работает ли уже другой экземпляр
    if [ -f "$STATE_FILE" ]; then
        local pid=$(cat "$STATE_FILE")
        if kill -0 $pid 2>/dev/null; then
            # Другой процесс уже работает
            exit 0
        fi
    fi
    
    # Сохраняем PID
    echo $$ > "$STATE_FILE"
    
    # Проверяем стрим
    if check_stream; then
        # Стрим активен
        if [ $(get_error_count) -gt 0 ]; then
            log_message "INFO: Стрим восстановлен"
            reset_errors
        fi
        
        # Проверяем HLS файлы
        if ! check_hls_files; then
            log_message "WARNING: HLS файлы отсутствуют при активном стриме"
            soft_recovery
        else
            # Все хорошо, проверяем символические ссылки
            check_symlinks
        fi
    else
        # Стрим не активен
        # Проверяем, есть ли RTMP соединение
        if netstat -an | grep -q ":1935.*ESTABLISHED"; then
            # Есть RTMP соединение, но нет HLS
            local errors=$(increment_errors)
            log_message "ERROR: RTMP соединение есть, но HLS не работает (ошибка $errors из $MAX_ERRORS)"
            
            if [ $errors -lt 3 ]; then
                soft_recovery
            elif [ $errors -lt $MAX_ERRORS ]; then
                hard_recovery
            else
                # Слишком много ошибок, полная перезагрузка
                log_message "CRITICAL: Слишком много ошибок, перезапуск nginx..."
                systemctl restart nginx
                reset_errors
                sleep 5
            fi
        else
            # Нет активного стрима - это нормально
            if [ $(get_error_count) -gt 0 ]; then
                reset_errors
            fi
        fi
    fi
    
    # Удаляем файл состояния
    rm -f "$STATE_FILE"
}

# Запуск
main
