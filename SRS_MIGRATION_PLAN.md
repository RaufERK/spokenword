# SRS Migration Plan

## Strategy

- nginx 1.28 остаётся для HTTPS/HLS (сайт + раздача).
- RTMP выносим в SRS (Simple Realtime Server).
- Цель: стабильный стриминг на мобильных (HLS + WebRTC), отказ от устаревшего nginx-rtmp.

## Deployment

- Ubuntu 22.04, тот же хост, systemd-юнит для SRS.
- OBS → RTMP → SRS → HLS/WebRTC → nginx → зрители.

## Ports

- RTMP ingest: 1935/tcp (OBS → SRS).
- SRS API: 1985 (локально, наружу не открывать).
- WebRTC: 8000/udp.
- nginx: 80/443.

## Domains and TLS

- Основной домен: https://www.spoken-word.ru
- HLS: https://www.spoken-word.ru/hls/`<stream>`.m3u8
- WebRTC (WHEP): https://www.spoken-word.ru/rtc/v1/whep/
- TLS-сертификаты: текущие Let’s Encrypt на nginx.

## OBS and Authentication

- RTMP URL: rtmp://stream.spoken-word.ru/live/<stream_key>
- Первоначально — секретный ключ в пути.
- Позже — auth webhook on_publish.

## HLS

- Classic HLS, latency ~12–18s.
- Segment: 2s, window: 6.
- Path: /var/lib/srs/hls
- nginx alias: /hls/
- Cleanup enabled.

## WebRTC

- Включить сразу (WHEP).
- TURN не нужен (есть публичный IP).
- Используется как опция «низкая задержка».

## Transcoding

- На старте без перекодирования.
- При необходимости — профили 1080p/720p/480p.

## Nginx integration

- Fix listen: `listen 443 ssl http2;`
- Location for HLS with CORS/Cache headers.
- Proxy /rtc/v1/whep/ → 127.0.0.1:1985

## Security

- Открыть наружу: 1935/tcp, 8000/udp, 443/tcp.
- Ограничить RTMP по IP/ключу.
- Rate limiting для /hls/.

## Services and Logs

- systemd unit: srs.service (Restart=always).
- logrotate для srs.log и nginx.
- health-check через API.

## Compatibility

- Icecast оставить параллельно для audio-only на время миграции.
- После проверки — выключить.

## Frontend Integration

- Next.js player: hls.js (Chrome/Firefox), native HLS (Safari).
- WebRTC player: отдельная страница /webrtc.
- URL форматы и примеры вынесены выше.
