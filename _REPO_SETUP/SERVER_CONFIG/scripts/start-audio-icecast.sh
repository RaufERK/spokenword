#!/bin/bash

STREAM_KEY=$1

if [ -z "$STREAM_KEY" ]; then
  echo "Usage: $0 <stream_key>"
  exit 1
fi

RTMP_URL="rtmp://127.0.0.1:1935/live/${STREAM_KEY}"
ICECAST_URL="icecast://source:WneI2DnKgzAQ4I9G@127.0.0.1:8000/main"

LOG_FILE="/var/log/icecast2/ffmpeg-${STREAM_KEY}.log"

echo "[$(date)] Starting audio stream: ${STREAM_KEY}" >> "$LOG_FILE"

exec ffmpeg -i "$RTMP_URL" \
  -vn \
  -map 0:a \
  -c:a libmp3lame \
  -b:a 128k \
  -ar 44100 \
  -ac 2 \
  -f mp3 \
  -content_type audio/mpeg \
  -ice_name "Spoken Word Radio" \
  -ice_description "Live Audio Stream" \
  -ice_genre "Talk" \
  -ice_public 0 \
  "$ICECAST_URL" \
  >> "$LOG_FILE" 2>&1
