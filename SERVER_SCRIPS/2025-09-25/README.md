# Серверные скрипты и конфигурации (сохранено 2025-09-25)

- Сервер: amster
- Папка: SERVER_SCRIPS/2025-09-25

## Что включено

- /etc/nginx/nginx.conf — Основная конфигурация nginx с RTMP блоком
- /etc/nginx/sites-available/spoken-word.ru — Конфигурация виртуального хоста для сайта и HLS
- /usr/local/bin/cleanup-hls.sh — Скрипт очистки/подготовки HLS при publish
- /usr/local/bin/on-publish-done.sh — Скрипт действий при окончании публикации
- /usr/local/bin/hls-monitor.sh — Мониторинг HLS: ссылки, права, авто-восстановление
- /usr/local/bin/stream-watchdog.sh — Watchdog по cron: проверка и восстановление стрима
- /usr/local/bin/start-forwards.sh — Запуск форвардов (YouTube/RuTube) при publish
- /usr/local/bin/stop-forwards.sh — Остановка форвардов (YouTube/RuTube) при done
- /root/fix-streaming-permissions.sh — Быстрое восстановление прав на /srv/streaming
- /root/fix-streaming-enhanced.sh — Расширенное исправление стриминга (перезагрузка nginx, права, ссылки)
- /usr/local/bin/start-hls.sh — Скрипт HLS конвертации (если используется)
- /usr/local/bin/start-stream-services.sh — Запуск systemd сервисов стриминга (если используется)
- /usr/local/bin/stop-stream-services.sh — Остановка systemd сервисов стриминга (если используется)
- /etc/systemd/system/hls-worker@.service — Systemd юнит: HLS конвертация
- /etc/systemd/system/hls-conf@.service — Systemd юнит: HLS для конференций
- /etc/systemd/system/audio-hls@.service — Systemd юнит: Аудио HLS для ключа
- /etc/systemd/system/stream-archive@.service — Systemd юнит: Архивирование потоков
- /etc/systemd/system/after-archive@.service — Systemd юнит: Пост-обработка архива
- /etc/systemd/system/youtube-forward@.service — Systemd юнит: форвард на YouTube (copy)
- /etc/systemd/system/rutube-forward@.service — Systemd юнит: форвард на RuTube (copy)
- /etc/default/youtube-forward — Окружение: YOUTUBE_RTMP/YOUTUBE_KEY
- /etc/default/rutube-forward — Окружение: RUTUBE_RTMP/RUTUBE_KEY
- /etc/sudoers.d/rtmp-forwards — Права sudo для www-data на управление форвардами

## Дополнительно

- etc/nginx/nginx.full.conf.txt — полный вывод nginx -T

