#!/bin/bash

STREAM_NAME="$1"
RTMP_URL="rtmp://127.0.0.1:1935/live/${STREAM_NAME}"
OUTPUT_DIR="/srv/streaming/hls/${STREAM_NAME}"

mkdir -p "${OUTPUT_DIR}"
LOG_FILE="/var/log/ffmpeg-hls-${STREAM_NAME}.log"

echo "$(date): Starting HLS transcoding (360p) for ${STREAM_NAME}" > "${LOG_FILE}"

/usr/local/bin/ffmpeg -i "${RTMP_URL}" \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -s 640x360 -b:v 600k -maxrate 700k -bufsize 1200k \
  -profile:v baseline -level 3.1 \
  -g 50 -keyint_min 50 -sc_threshold 0 -bf 0 \
  -c:a aac -ar 48000 -b:a 96k -ac 2 \
  -f hls -hls_time 2 -hls_list_size 30 \
  -hls_flags delete_segments+independent_segments \
  -hls_segment_filename "${OUTPUT_DIR}/segment_%03d.ts" \
  "${OUTPUT_DIR}/index.m3u8" \
  >> "${LOG_FILE}" 2>&1 &

echo $! > "/var/run/ffmpeg-hls-${STREAM_NAME}.pid"

sleep 3
chown -R www-data:www-data "${OUTPUT_DIR}"
chmod -R 755 "${OUTPUT_DIR}"

echo "$(date): HLS transcoding started successfully" >> "${LOG_FILE}"
