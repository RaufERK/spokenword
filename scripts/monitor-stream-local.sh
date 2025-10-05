#!/bin/bash

# Локальный мониторинг холодного старта через API
# Не требует SSH доступа, работает через публичный API

set -euo pipefail

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

STREAM_KEY="main"
API_URL="https://spoken-word.ru/api/stream-status?key=${STREAM_KEY}"
HLS_URL="https://spoken-word.ru/hls/live/${STREAM_KEY}.m3u8"
LOG_FILE="./cold-start-local-$(date +%Y%m%d-%H%M%S).log"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  HLS Cold Start Monitor (Local)${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${BLUE}Stream key:${NC} ${STREAM_KEY}"
echo -e "${BLUE}API URL:${NC} ${API_URL}"
echo -e "${BLUE}HLS URL:${NC} ${HLS_URL}"
echo -e "${BLUE}Log file:${NC} ${LOG_FILE}"
echo ""
echo -e "${YELLOW}Ожидание начала стрима...${NC}"
echo -e "${YELLOW}Запусти стрим в OBS когда будешь готов${NC}"
echo -e "${YELLOW}Нажми CTRL+C для остановки${NC}"
echo ""

# Функция логирования
log() {
    local timestamp=$(date '+%H:%M:%S')
    local message="[${timestamp}] $1"
    echo -e "$2${message}${NC}"
    echo "${message}" >> "${LOG_FILE}"
}

# Функция проверки API
check_api() {
    curl -s "${API_URL}" 2>/dev/null || echo '{"error":"api_error"}'
}

# Функция проверки HLS плейлиста
check_hls() {
    curl -s -o /dev/null -w "%{http_code}" "${HLS_URL}" 2>/dev/null
}

# Функция получения плейлиста
get_playlist() {
    curl -s "${HLS_URL}" 2>/dev/null || echo ""
}

# Таймеры
START_TIME=$(date +%s)
PLAYLIST_FOUND=false
FIRST_LIVE_TIME=""
API_LIVE_TIME=""
WARMED_UP_TIME=""

# Основной цикл
while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Проверяем API
    API_RESPONSE=$(check_api)
    
    # Парсим JSON
    IS_LIVE=$(echo "$API_RESPONSE" | grep -o '"isLive":[^,}]*' | cut -d':' -f2)
    IS_WARMING_UP=$(echo "$API_RESPONSE" | grep -o '"isWarmingUp":[^,}]*' | cut -d':' -f2)
    SEGMENT_COUNT=$(echo "$API_RESPONSE" | grep -o '"segmentCount":[^,}]*' | cut -d':' -f2)
    FILE_AGE=$(echo "$API_RESPONSE" | grep -o '"fileAge":[^,}]*' | cut -d':' -f2)
    TS_FILES=$(echo "$API_RESPONSE" | grep -o '"tsFilesOnDisk":[^,}]*' | cut -d':' -f2)
    
    # Проверяем HLS доступность
    HLS_CODE=$(check_hls)
    
    # Обработка событий
    if [ "$HLS_CODE" = "200" ] && [ "$PLAYLIST_FOUND" = false ]; then
        PLAYLIST_FOUND=true
        FIRST_LIVE_TIME="${ELAPSED}"
        log "✅ Плейлист доступен! HTTP 200 (через ${ELAPSED} сек)" "${GREEN}"
        
        # Показываем первый плейлист
        PLAYLIST_CONTENT=$(get_playlist)
        log "📄 Первый плейлист:" "${BLUE}"
        echo "$PLAYLIST_CONTENT" | tee -a "${LOG_FILE}"
        echo "" | tee -a "${LOG_FILE}"
    fi
    
    if [ "$IS_LIVE" = "true" ] && [ -z "$API_LIVE_TIME" ]; then
        API_LIVE_TIME="${ELAPSED}"
        log "🔴 API: isLive=true (через ${ELAPSED} сек)" "${GREEN}"
    fi
    
    if [ "$IS_LIVE" = "true" ] && [ "$IS_WARMING_UP" = "false" ] && [ -z "$WARMED_UP_TIME" ]; then
        WARMED_UP_TIME="${ELAPSED}"
        log "🎉 Стрим прогрелся! isWarmingUp=false (через ${ELAPSED} сек)" "${GREEN}"
    fi
    
    # Статус строка
    if [ "$IS_LIVE" = "true" ]; then
        STATUS_COLOR="${GREEN}"
        STATUS="🔴 LIVE"
    else
        STATUS_COLOR="${YELLOW}"
        STATUS="⏳ OFFLINE"
    fi
    
    WARMING=""
    if [ "$IS_WARMING_UP" = "true" ]; then
        WARMING=" ${MAGENTA}[ПРОГРЕВ]${NC}"
    fi
    
    log "T+${ELAPSED}s | ${STATUS}${WARMING} | Сег: ${SEGMENT_COUNT:-0} | TS: ${TS_FILES:-0} | Age: ${FILE_AGE:-0}s | HTTP: ${HLS_CODE}" "${STATUS_COLOR}"
    
    # Условие завершения: стрим прогрелся и работает 10 секунд
    if [ -n "$WARMED_UP_TIME" ] && [ $((ELAPSED - WARMED_UP_TIME)) -ge 10 ]; then
        log "✅ Мониторинг завершён: стрим стабилен 10+ секунд после прогрева" "${GREEN}"
        break
    fi
    
    # Если стрим в эфире более 60 секунд - завершаем мониторинг
    if [ "$ELAPSED" -ge 90 ]; then
        log "⏰ Мониторинг завершён: прошло 90 секунд" "${BLUE}"
        break
    fi
    
    sleep 1
done

# Финальный отчёт
echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  Отчёт о холодном старте${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

if [ -n "$FIRST_LIVE_TIME" ]; then
    echo -e "${GREEN}✅ HLS плейлист доступен через: ${FIRST_LIVE_TIME} сек${NC}"
else
    echo -e "${RED}❌ HLS плейлист не стал доступен${NC}"
fi

if [ -n "$API_LIVE_TIME" ]; then
    echo -e "${GREEN}✅ API показал isLive=true через: ${API_LIVE_TIME} сек${NC}"
else
    echo -e "${RED}❌ API не показал isLive=true${NC}"
fi

if [ -n "$WARMED_UP_TIME" ]; then
    echo -e "${GREEN}✅ Стрим прогрелся через: ${WARMED_UP_TIME} сек${NC}"
    WARMUP_DURATION=$((WARMED_UP_TIME - FIRST_LIVE_TIME))
    echo -e "${BLUE}   Время прогрева: ${WARMUP_DURATION} сек${NC}"
else
    echo -e "${YELLOW}⚠️  Стрим не успел прогреться за время мониторинга${NC}"
fi

# Финальная проверка плейлиста
echo ""
echo -e "${BLUE}📄 Финальный плейлист:${NC}"
get_playlist | tee -a "${LOG_FILE}"

echo ""
echo -e "${BLUE}💾 Полный лог сохранён в: ${LOG_FILE}${NC}"
echo ""

# Рекомендации
echo -e "${CYAN}📊 Анализ:${NC}"
if [ -n "$WARMED_UP_TIME" ] && [ "$WARMED_UP_TIME" -lt 15 ]; then
    echo -e "${GREEN}✅ Отлично! Стрим прогрелся быстро (< 15 сек)${NC}"
elif [ -n "$WARMED_UP_TIME" ] && [ "$WARMED_UP_TIME" -lt 30 ]; then
    echo -e "${YELLOW}⚠️  Прогрев занял ${WARMED_UP_TIME} сек - можно улучшить${NC}"
    echo -e "${BLUE}   Рекомендация: увеличить hls_window до 10-12${NC}"
elif [ -n "$WARMED_UP_TIME" ]; then
    echo -e "${RED}❌ Прогрев занял ${WARMED_UP_TIME} сек - долго!${NC}"
    echo -e "${BLUE}   Рекомендация: применить все fix'ы из COLD_START_FIX.md${NC}"
else
    echo -e "${RED}❌ Стрим не прогрелся - есть проблемы${NC}"
    echo -e "${BLUE}   Рекомендация: проверить конфигурацию SRS${NC}"
fi

echo ""
echo -e "${GREEN}Готово!${NC}"

