#!/bin/bash

# Скрипт для мониторинга холодного старта HLS стрима
# Использование: ./monitor-cold-start.sh

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

STREAM_KEY="main"
HLS_DIR="/var/lib/srs/hls/live"
PLAYLIST="${HLS_DIR}/${STREAM_KEY}.m3u8"
API_URL="https://spoken-word.ru/api/stream-status?key=${STREAM_KEY}"
LOG_FILE="./cold-start-$(date +%Y%m%d-%H%M%S).log"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  HLS Cold Start Monitor${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${BLUE}Stream key:${NC} ${STREAM_KEY}"
echo -e "${BLUE}HLS directory:${NC} ${HLS_DIR}"
echo -e "${BLUE}Log file:${NC} ${LOG_FILE}"
echo ""
echo -e "${YELLOW}Ожидание начала стрима...${NC}"
echo -e "${YELLOW}Нажми CTRL+C для остановки${NC}"
echo ""

# Функция логирования
log() {
    local timestamp=$(date '+%H:%M:%S.%3N')
    local message="[${timestamp}] $1"
    echo -e "$2${message}${NC}"
    echo "${message}" >> "${LOG_FILE}"
}

# Функция проверки плейлиста
check_playlist() {
    if ssh root@spoken-word.ru "test -f ${PLAYLIST}"; then
        return 0
    else
        return 1
    fi
}

# Функция получения количества сегментов
get_segment_count() {
    ssh root@spoken-word.ru "cat ${PLAYLIST} 2>/dev/null | grep -c '.ts$' || echo 0"
}

# Функция получения списка TS файлов
get_ts_files() {
    ssh root@spoken-word.ru "ls -1 ${HLS_DIR}/${STREAM_KEY}-*.ts 2>/dev/null | wc -l || echo 0"
}

# Функция проверки API
check_api() {
    curl -s "${API_URL}" 2>/dev/null || echo '{"error":"api_error"}'
}

# Таймер
START_TIME=$(date +%s)
PLAYLIST_FOUND=false
FIRST_SEGMENT_TIME=""
API_LIVE_TIME=""

# Основной цикл мониторинга
while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Проверяем существование плейлиста
    if check_playlist; then
        if [ "$PLAYLIST_FOUND" = false ]; then
            PLAYLIST_FOUND=true
            log "✅ Плейлист создан! (через ${ELAPSED} сек)" "${GREEN}"
        fi
        
        # Получаем количество сегментов
        SEGMENT_COUNT=$(get_segment_count)
        TS_FILES=$(get_ts_files)
        
        if [ "$SEGMENT_COUNT" -gt 0 ] && [ -z "$FIRST_SEGMENT_TIME" ]; then
            FIRST_SEGMENT_TIME="${ELAPSED}"
            log "✅ Первый сегмент появился! (через ${ELAPSED} сек)" "${GREEN}"
        fi
        
        # Получаем данные API
        API_RESPONSE=$(check_api)
        IS_LIVE=$(echo "$API_RESPONSE" | grep -o '"isLive":[^,}]*' | cut -d':' -f2)
        IS_WARMING_UP=$(echo "$API_RESPONSE" | grep -o '"isWarmingUp":[^,}]*' | cut -d':' -f2)
        
        if [ "$IS_LIVE" = "true" ] && [ -z "$API_LIVE_TIME" ]; then
            API_LIVE_TIME="${ELAPSED}"
            log "✅ API отдаёт isLive=true! (через ${ELAPSED} сек)" "${GREEN}"
        fi
        
        # Выводим текущее состояние
        log "📊 T+${ELAPSED}s | Сегменты в playlist: ${SEGMENT_COUNT} | TS файлов: ${TS_FILES} | isLive: ${IS_LIVE} | isWarmingUp: ${IS_WARMING_UP}" "${CYAN}"
        
        # Проверяем содержимое плейлиста
        if [ "$SEGMENT_COUNT" -ge 4 ]; then
            PLAYLIST_CONTENT=$(ssh root@spoken-word.ru "cat ${PLAYLIST} 2>/dev/null")
            log "📄 Содержимое плейлиста:" "${BLUE}"
            echo "$PLAYLIST_CONTENT" >> "${LOG_FILE}"
            
            # Если достигли 10 сегментов - стрим прогрелся
            if [ "$SEGMENT_COUNT" -ge 10 ]; then
                log "🎉 Стрим полностью прогрелся! (10+ сегментов через ${ELAPSED} сек)" "${GREEN}"
                break
            fi
        fi
        
    else
        log "⏳ T+${ELAPSED}s | Ожидание плейлиста..." "${YELLOW}"
    fi
    
    sleep 1
done

# Финальный отчёт
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  Отчёт о холодном старте${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

if [ -n "$FIRST_SEGMENT_TIME" ]; then
    echo -e "${GREEN}✅ Плейлист создан через: ${FIRST_SEGMENT_TIME} сек${NC}"
else
    echo -e "${RED}❌ Плейлист не создан${NC}"
fi

if [ -n "$FIRST_SEGMENT_TIME" ]; then
    echo -e "${GREEN}✅ Первый сегмент через: ${FIRST_SEGMENT_TIME} сек${NC}"
else
    echo -e "${RED}❌ Сегменты не появились${NC}"
fi

if [ -n "$API_LIVE_TIME" ]; then
    echo -e "${GREEN}✅ API isLive=true через: ${API_LIVE_TIME} сек${NC}"
else
    echo -e "${RED}❌ API не отдал isLive=true${NC}"
fi

echo ""
echo -e "${BLUE}Полный лог сохранён в: ${LOG_FILE}${NC}"
echo ""

# Дополнительно: показываем последние 10 строк логов SRS
log "📋 Последние строки лога SRS:" "${BLUE}"
ssh root@spoken-word.ru "journalctl -u srs -n 20 --no-pager" >> "${LOG_FILE}"

echo -e "${GREEN}Мониторинг завершён!${NC}"

