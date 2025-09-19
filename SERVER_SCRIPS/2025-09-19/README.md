# Серверные скрипты и конфигурации (сохранено 2025-09-19)

- Сервер: amster
- Папка: SERVER_SCRIPS/2025-09-19

## Что включено

- /etc/nginx/nginx.conf — Основная конфигурация nginx с RTMP блоком
- /etc/nginx/sites-available/spoken-word.ru — Конфигурация виртуального хоста для сайта и HLS
- /usr/local/bin/hls-monitor.sh — Мониторинг HLS: ссылки, права, авто-восстановление
- /usr/local/bin/stream-watchdog.sh — Watchdog по cron: проверка и восстановление стрима
- /root/fix-streaming-permissions.sh — Быстрое восстановление прав на /srv/streaming
- /root/fix-streaming-enhanced.sh — Расширенное исправление стриминга (перезагрузка nginx, права, ссылки)
- /usr/local/bin/start-hls.sh — Скрипт HLS конвертации (если используется)
- /usr/local/bin/start-stream-services.sh — Запуск systemd сервисов стриминга (если используется)
- /usr/local/bin/stop-stream-services.sh — Остановка systemd сервисов стриминга (если используется)
- /etc/systemd/system/hls-worker@.service — Systemd юнит: HLS конвертация
- /etc/systemd/system/hls-conf@.service — Systemd юнит: HLS для конференций
- /etc/systemd/system/stream-archive@.service — Systemd юнит: Архивирование потоков
- /etc/systemd/system/after-archive@.service — Systemd юнит: Пост-обработка архива

## Дополнительно

- etc/nginx/nginx.full.conf.txt — полный вывод nginx -T

