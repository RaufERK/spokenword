#!/bin/bash

STREAM_NAME="$1"
PID_FILE="/var/run/ffmpeg-hls-${STREAM_NAME}.pid"
LOG_FILE="/var/log/ffmpeg-hls-${STREAM_NAME}.log"

if [ -f "${PID_FILE}" ]; then
    PID=$(cat "${PID_FILE}")
    echo "$(date): Stopping FFmpeg HLS process ${PID}" >> "${LOG_FILE}"
    kill ${PID} 2>/dev/null
    rm -f "${PID_FILE}"
    echo "$(date): FFmpeg HLS stopped" >> "${LOG_FILE}"
else
    echo "$(date): PID file not found" >> "${LOG_FILE}"
fi

# Очищаем старые сегменты через 60 секунд
(sleep 60 && rm -rf "/srv/streaming/hls/${STREAM_NAME}") &
