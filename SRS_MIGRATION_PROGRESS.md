### SRS migration — progress (2025-10-02)

- **Цель**: стабильный мобильный стрим (360p HLS) на сайте, параллельные RTMP-форварды в YouTube/RuTube, аудио через Icecast.

## Сделано
- **nginx**: обновлён до 1.28.0 (stable, nginx.org), поставлен hold на версию; RTMP-блок в `nginx.conf` выключен. Сервис слушает :80/:443.
  - Бэкапы: `/root/nginx-backups/etc-nginx-20251002124413.tgz`, локальный бэкап сайта: `/etc/nginx/sites-enabled/spoken-word.ru.bak.20251002150513`.
- **FFmpeg**: установлен статический `ffmpeg/ffprobe` в `/usr/local/bin`.
- **SRS**: собран и установлен SRS 6.0.177, запущен как `systemd` (`srs.service`).
  - Порты: RTMP `:1935/tcp`, WebRTC `:8000/udp`, HTTP API `127.0.0.1:1985`.
  - Конфиг `/etc/srs/srs.conf`:
    - HLS: путь `/var/lib/srs/hls` (сиmlink на `/srv/streaming/hls`), `hls_fragment=2s`, `hls_window=12`, `hls_cleanup=on`.
    - `rtc_server` включён, слушает `udp/8000`.
    - Transcode 360p: H.264 baseline 640x360 ~700kbps + AAC 96kbps, вывод в `rtmp://127.0.0.1:[port]/[app]/[stream]_360`.
- **Проверка HLS (база)**: при пуше `rtmp://127.0.0.1/live/test` генерируются сегменты и плейлист `test.m3u8` в `/var/lib/srs/hls/live/`.

## Осталось сделать (следующая сессия)
- **Транскод 360p end-to-end**
  - Убедиться, что появляется `test_360.m3u8` для `live/test`.
  - Проверить доступность через nginx: `https://www.spoken-word.ru/hls/live/test_360.m3u8`.
  - При необходимости подправить GOP=2s (keyint=60), fps=30, битрейт.
- **WHEP (WebRTC) через nginx**
  - Создать сниппет: `/etc/nginx/snippets/whep_spoken_word.conf` с прокси на `http://127.0.0.1:1985/rtc/v1/whep/`.
  - Включить его в HTTPS-сервер `spoken-word.ru` (include), проверить `nginx -t`, выполнить reload.
- **Форварды RTMP → YouTube/RuTube**
  - Получить RTMP URL/ключи, добавить forward в `srs.conf` (или `on_publish` скрипты).
  - Протестировать параллельный пуш без влияния на HLS 360p.
- **nginx правки**
  - Заменить устаревший `listen ... http2` на `listen 443 ssl;` и `http2 on;` во всех сайтах (`amasters.*`, `spoken-word.ru`, и др.).
  - Заголовки HLS: `.m3u8` — `no-cache`; `.ts` — `public, max-age=30`; CORS `*`.
- **Мобильные тесты**
  - Проверить воспроизведение HLS 360p на iOS/Android, в «плохих» сетях.
  - Опционально включить WebRTC (WHEP) как режим низкой задержки.
- **Безопасность/эксплуатация**
  - Защитить RTMP (длинный `stream_key` или `on_publish` webhook).
  - Ротация логов `srs` и `nginx`.

## Подсказки
- Запуск/статус
```bash
sudo systemctl status srs
sudo systemctl restart srs
sudo nginx -t && sudo systemctl reload nginx
ss -lntup | grep -E ':1935|:8000|:443'
```
- Тестовый пуш в SRS (локально)
```bash
ffmpeg -re -f lavfi -i testsrc=size=640x360:rate=30 \
  -f lavfi -i sine=frequency=1000:sample_rate=44100 -shortest \
  -c:v libx264 -preset veryfast -g 60 -keyint_min 60 -b:v 700k -pix_fmt yuv420p \
  -c:a aac -b:a 96k -f flv rtmp://127.0.0.1/live/test
```
- Пути
  - SRS конфиг: `/etc/srs/srs.conf`
  - HLS: `/var/lib/srs/hls` → `/srv/streaming/hls`
  - Nginx сайт: `/etc/nginx/sites-enabled/spoken-word.ru`
  - WHEP сниппет: `/etc/nginx/snippets/whep_spoken_word.conf`

## OBS и домены
- OBS: `rtmp://stream.spoken-word.ru/live/<stream_key>` (после A-записи DNS).
- На сайте: `/hls/live/<stream>_360.m3u8`.

## Примечания
- В nginx 1.28 директиву `http2` выносить отдельно (`http2 on;`).
- UDP/8000 открыт; при проблемах у операторов — стабильный HLS-фолбэк.






