#!/usr/bin/env bash
# sw-update — единая перезагрузка скриптов/юнитов/nginx
# можно вызывать обычным пользователем: скрипт сам перезапустится через sudo

if [[ $EUID -ne 0 ]]; then
  exec sudo "$0" "$@"            # повторный запуск уже от root
fi

set -euo pipefail

BINLIST=( start-hls.sh record-archive.sh after-archive.sh compress-archive.sh )

for f in "${BINLIST[@]/#/\/usr\/local\/bin\/}"; do
  chown root:www-data "$f"
  chmod 750            "$f"
done

systemctl daemon-reload
/usr/local/nginx/sbin/nginx -t && systemctl reload nginx

echo "✓ systemd перечитан • nginx перезагружен."
