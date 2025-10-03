# SRS Migration Final Confirmation

## Версия и установка

- Используем **SRS v5 (последний stable релиз)**.
- Установка: готовый бинарь под Ubuntu 22.04.
- Запуск через `systemd` (юнит `srs.service`).

## DNS

- Добавить A-запись: **stream.spoken-word.ru → IP сервера**.
- RTMP работает без TLS (`rtmp://`),
  TLS нужен только для HLS/WebRTC через nginx.

## HLS параметры

- `hls_fragment=2s`
- `hls_window=6`
- `hls_cleanup=on`
- `hls_dispose` оставить по умолчанию.
- Хранение сегментов: `/var/lib/srs/hls`.
- Выдача пользователям через nginx `/hls/`.

## WebRTC

- Открыть наружу **UDP 8000**.
- В конфиге SRS (`rtc.server`) указать **публичный IP сервера**.
- Использовать `WHEP` для просмотра (WHIP не требуется).

## nginx

- Убрать устаревший синтаксис `listen ... http2`.
- Использовать:
  ```nginx
  listen 443 ssl;
  http2 on;
  ```
