#!/usr/bin/env bash
# sw-update — перезагрузка nginx + systemd-юнитов и поправка прав

# ── если не root — перезапускаем через sudo ───────────────────────────
if [[ $EUID -ne 0 ]]; then exec sudo "$0" "$@"; fi
set -euo pipefail

# цвета
OK="\e[32m✔\e[0m"
INFO="\e[36m➜\e[0m"
ERR="\e[31m❌\e[0m"

BINLIST=(
  start-hls.sh record-archive.sh after-archive.sh compress-archive.sh
  start-stream-services.sh stop-stream-services.sh
)

printf "$INFO обновляем права исполнителей…\n"
for f in "${BINLIST[@]/#/\/usr\/local\/bin\/}"; do
  [[ -f $f ]] || { printf "$ERR %s not found, skip\n" "$(basename "$f")"; continue; }
  chown root:www-data "$f" && chmod 750 "$f"
done

printf "$INFO systemd daemon-reload…\n"
systemctl daemon-reload
systemctl reset-failed

# останавливаем все worker-ы (без двойных stop)
systemctl stop "hls-worker@*" "stream-archive@*"

# nginx — проверка и reload
printf "$INFO nginx -t …\n"
nginx -t && { systemctl reload nginx; printf "$OK nginx перезагружен\n"; } \
          || { printf "$ERR nginx config error, abort\n"; exit 1; }

# очищаем старый rtmp-лог
: > /var/log/nginx/error_rtmp.log

printf "$OK systemd перечитан • все worker-ы остановлены\n"
