#!/bin/bash

# Параметры
STREAM_NAME="$1"
RTMP_URL="rtmp://127.0.0.1:1936/internal/${STREAM_NAME}"
OUTPUT_DIR="/srv/streaming/hls/${STREAM_NAME}"

# Создаём директории для каждого профиля
mkdir -p "${OUTPUT_DIR}/240p"
mkdir -p "${OUTPUT_DIR}/360p"
mkdir -p "${OUTPUT_DIR}/480p"

# Логирование
LOG_FILE="/var/log/ffmpeg-hls-${STREAM_NAME}.log"
echo "$(date): Starting HLS transcoding for ${STREAM_NAME}" > "${LOG_FILE}"

# FFmpeg с 3 профилями качества
/usr/local/bin/ffmpeg -i "${RTMP_URL}" \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -c:a aac -ar 48000 -b:a 96k \
  \
  -map 0:v:0 -map 0:a:0 -s:v:0 426x240 -b:v:0 400k -maxrate:v:0 450k -bufsize:v:0 800k -profile:v:0 baseline -level 3.0 -g 50 -keyint_min 50 -sc_threshold 0 \
  -f hls -hls_time 2 -hls_list_size 15 -hls_flags delete_segments+independent_segments \
  -hls_segment_filename "${OUTPUT_DIR}/240p/segment_%03d.ts" "${OUTPUT_DIR}/240p/index.m3u8" \
  \
  -map 0:v:0 -map 0:a:0 -s:v:1 640x360 -b:v:1 600k -maxrate:v:1 700k -bufsize:v:1 1200k -profile:v:1 baseline -level 3.1 -g 50 -keyint_min 50 -sc_threshold 0 \
  -f hls -hls_time 2 -hls_list_size 15 -hls_flags delete_segments+independent_segments \
  -hls_segment_filename "${OUTPUT_DIR}/360p/segment_%03d.ts" "${OUTPUT_DIR}/360p/index.m3u8" \
  \
  -map 0:v:0 -map 0:a:0 -s:v:2 854x480 -b:v:2 900k -maxrate:v:2 1000k -bufsize:v:2 1800k -profile:v:2 baseline -level 3.1 -g 50 -keyint_min 50 -sc_threshold 0 \
  -f hls -hls_time 2 -hls_list_size 15 -hls_flags delete_segments+independent_segments \
  -hls_segment_filename "${OUTPUT_DIR}/480p/segment_%03d.ts" "${OUTPUT_DIR}/480p/index.m3u8" \
  >> "${LOG_FILE}" 2>&1 &

# Сохраняем PID процесса
echo $! > "/var/run/ffmpeg-hls-${STREAM_NAME}.pid"

# Ждём пока создадутся первые сегменты
sleep 5

# Создаём мастер-плейлист
cat > "${OUTPUT_DIR}/master.m3u8" << 'EOFMASTER'
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=426x240,NAME="240p"
240p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=700000,RESOLUTION=640x360,NAME="360p"
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME="480p"
480p/index.m3u8
EOFMASTER

# Выставляем права
chown -R www-data:www-data "${OUTPUT_DIR}"
chmod -R 755 "${OUTPUT_DIR}"

echo "$(date): HLS transcoding started successfully" >> "${LOG_FILE}"
