#!/usr/bin/env bash
# Перекодируем FLV-файлы, относящиеся к текущему ключу,
# в H.264/AAC MP4 c -crf 23, +faststart и
# удаляем исходные .flv.

set -euo pipefail
KEY="$1"                         # ITMUG2025
ARCHIVE="/srv/streaming/archive"

shopt -s nullglob
for FLV in "${ARCHIVE}/${KEY}"_*.flv; do
    # Имя без ключа:  ITMUG2025_2025-05-26_14-15-53.flv → 2025-05-26_14-15-53
    TS="${FLV##*/}"              # отрезаем путь
    TS="${TS#${KEY}_}"           # отрезаем ключ и _
    TS="${TS%.flv}"              # убираем расширение

    TMP_MP4="${ARCHIVE}/${TS}.tmp.mp4"
    OUT_MP4="${ARCHIVE}/${TS}.mp4"

    /usr/bin/ffmpeg -hide_banner -loglevel warning -y \
        -i "$FLV" \
        -c:v libx264 -preset ultrafast -crf 26 \
        -c:a aac     -b:a 128k \
        -movflags +faststart "$TMP_MP4"

    mv -f "$TMP_MP4" "$OUT_MP4"
    rm -f -- "$FLV"
done
