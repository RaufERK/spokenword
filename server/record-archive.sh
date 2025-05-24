#!/usr/bin/env bash
set -euo pipefail
umask 0002

APP="${1:-live}"
NAME="${2:-stream}"

BASE=/srv/streaming
DATE=$(date +%F)
TS=$(date +%H-%M-%S)
DEST="$BASE/archive/$DATE"
LOG="$BASE/start-hls.log"

mkdir -p "$DEST"

printf '%(%F %T)T  NEW ARCHIVE  %s/%s → %s/%s_%s.flv (pid=%d)\n' \
        -1 "$APP" "$NAME" "$DEST" "$NAME" "$TS" $$ >>"$LOG"

exec /usr/bin/ffmpeg -hide_banner -loglevel error \
     -i "rtmp://127.0.0.1/${APP}/${NAME}" \
     -c copy \
     -f flv  "$DEST/${NAME}_${TS}.flv"
#/usr/local/bin/record-archive.sh
#chmod +x /usr/local/bin/record-archive.sh
#Ночью по cron сможете конвертировать в MP4 без перекодирования:
#ffmpeg -i input.flv -c copy output.mp4
#systemctl daemon-reload
#nginx -t && systemctl reload nginx
#Перечитать юниты и перезапустить
#systemctl daemon-reload
#systemctl restart stream-archive@ITMUG2025.service

