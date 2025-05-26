#!/usr/bin/env bash
# Конвертируем все файлы stream_*.flv ➜ stream_*.mp4
# Сохраняем «быстрый старт» (-movflags +faststart) и
# удаляем исходный FLV, если конвертация прошла успешно.

set -euo pipefail

NAME="$1"
ARCHIVE_DIR="/srv/streaming/archive"

# если маска не найдёт ни одного файла — цикл просто не выполнится
shopt -s nullglob
for FLV in "${ARCHIVE_DIR}/${NAME}"_*.flv; do
    MP4="${FLV%.flv}.mp4"

    /usr/bin/ffmpeg -hide_banner -loglevel error -y \
        -i "$FLV" -c copy -movflags +faststart "$MP4"

    # удалить исходник; если уже стёрт — не падаем
    rm -f -- "$FLV" || true
done
root@cv4775291:/usr/local/bin# cat compress-archive.sh
# /usr/local/bin/compress-archive.sh
#!/usr/bin/env bash
set -euo pipefail
cd /srv/streaming/archive
for f in *.flv; do
  [[ -e "$f" ]] || exit 0
  mp4="${f%.flv}.mp4"
  /usr/bin/ffmpeg -hide_banner -loglevel error -i "$f" \
        -c:v libx264 -preset slow -crf 23 -c:a copy "$mp4" && rm "$f"
done
