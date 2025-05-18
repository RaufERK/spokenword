#!/usr/bin/env bash
set -euo pipefail
umask 0002

APP="$1"
NAME="$2"

BASE=/srv/streaming
LIVE_DIR="$BASE/live"
ARCH_DIR="$BASE/archive"
LOG="$BASE/start-hls.log"

mkdir -p "$LIVE_DIR" "$ARCH_DIR"

{
  printf '%(%F %T)T  NEW PUBLISH  %s/%s  (pid=%d)\n' -1 "$APP" "$NAME" $$

  ln -sf "${LIVE_DIR}/${NAME}.m3u8" "${LIVE_DIR}/playlist.m3u8"

  export FFREPORT="file=${LIVE_DIR}/${NAME}-ffmpeg.log:level=32"

  exec /usr/bin/ffmpeg -hide_banner -loglevel info \
       -i "rtmp://127.0.0.1/${APP}/${NAME}"              \
       -c:v libx264 -preset veryfast -b:v 1500k          \
       -c:a aac -b:a 128k                                \
       -hls_time 4 -hls_list_size 5                      \
       -hls_flags delete_segments                        \
       -hls_segment_filename "${LIVE_DIR}/${NAME}%03d.ts"\
       -f hls "${LIVE_DIR}/${NAME}.m3u8"

} >>"$LOG" 2>&1

printf '%(%F %T)T  STREAM %s/%s STOPPED (pid=%d)\n' -1 "$APP" "$NAME" $$ >>"$LOG"
# END  END  END  END  END  END  END  END  END  END  END 
# END  END  END  END  END  END  END  END  END  END  END 
# END  END  END  END  END  END  END  END  END  END  END 
# nano /usr/local/bin/start-hls.sh
# nano /usr/local/bin/start-hls.sh
# nano /usr/local/bin/start-hls.sh



install -m755 -o root -g www-data start-hls.sh /usr/local/bin/start-hls.sh



# очистить предыдущие результаты
rm -rf /srv/streaming/*
mkdir -p /srv/streaming/{live,archive}
chown -R www-data:www-data /srv/streaming
> /var/log/start-hls.log

nginx -t && systemctl restart nginx


#1 — Тестовый поток без OBS
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=440 \
       -c:v libx264 -preset veryfast -c:a aac -f flv \
       rtmp://127.0.0.1/live/test


#2 — Смотреть, что происходит
tail -f /var/log/start-hls.log        # появится строка NEW PUBLISH…
ls -l /srv/streaming/live/test*.m3u8  # через пару секунд увидите файл
ffprobe http://localhost/live/test.m3u8 -loglevel error -show_streams


#Логи, которые стоит мониторить
#Что	Команда
#Скрипт FFmpeg	tail -f /var/log/start-hls.log
#Список сегментов	tail -f /srv/streaming/live/ITMUG2025.m3u8
#Соединения RTMP	lsof -nP -iTCP:1935 -sTCP:ESTABLISHED




#1. Создать лог-файл, разрешённый www-data
touch /var/log/start-hls.log
chown www-data:www-data /var/log/start-hls.log
chmod 664 /var/log/start-hls.log



cat /usr/local/bin/start-hls.sh



curl -I http://localhost/live/playlist.m3u8






# 1. заменить файл и выдать права
install -m755 -o root -g www-data start-hls.sh /usr/local/bin/start-hls.sh

# 2. очистить старые сегменты, если нужно
rm -rf /srv/streaming/*
mkdir -p /srv/streaming/{live,archive}
chown -R www-data:www-data /srv/streaming

# 3. перезапустить nginx (скрипт запускает nginx-rtmp)
nginx -t && systemctl restart nginx
