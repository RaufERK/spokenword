#!/bin/bash

STREAM_KEY=$1

echo "[$(date)] START called with key: ${STREAM_KEY}" >> /tmp/icecast-exec.log

if [ -z "$STREAM_KEY" ]; then
  echo "[$(date)] ERROR: No stream key provided" >> /tmp/icecast-exec.log
  exit 1
fi

# Создать директорию для логов если не существует
mkdir -p /var/log/icecast2
chown www-data:www-data /var/log/icecast2

# Остановить старый процесс если есть
pkill -f "ffmpeg.*icecast.*${STREAM_KEY}"

# Запустить в фоне
nohup /usr/local/bin/start-audio-icecast.sh "${STREAM_KEY}" >/dev/null 2>&1 &

echo "[$(date)] STARTED ffmpeg for ${STREAM_KEY}" >> /tmp/icecast-exec.log

exit 0
