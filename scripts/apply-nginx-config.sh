#!/bin/bash

# Применение оптимизированной конфигурации nginx для стабильного стриминга

echo "🔧 Применение оптимизированной конфигурации nginx"
echo "=================================================="

# Проверка запуска
if [ "$1" != "confirm" ]; then
    echo "⚠️  ВНИМАНИЕ: Это заменит текущую конфигурацию nginx!"
    echo ""
    echo "Что будет сделано:"
    echo "  1. Сохранение резервной копии текущей конфигурации"
    echo "  2. Применение оптимизированной конфигурации для мобильных"
    echo "  3. Тестирование новой конфигурации"
    echo "  4. Перезагрузка nginx"
    echo ""
    echo "Для продолжения выполните:"
    echo "  $0 confirm"
    exit 0
fi

# Подключение к серверу
ssh amster "sudo bash -s" << 'EOF'
set -e

echo "📦 Создание резервной копии..."
BACKUP_DIR="/etc/nginx/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp /etc/nginx/nginx.conf "$BACKUP_DIR/nginx.conf.backup"
echo "✅ Резервная копия сохранена в $BACKUP_DIR"

echo ""
echo "📝 Применение новой конфигурации..."

# Создаем новую конфигурацию
cat > /tmp/nginx-new.conf << 'NGINX_CONFIG'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    # Оптимизация буферов для стриминга
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;
    output_buffers 1 32k;
    postpone_output 1460;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    ##
    # Logging Settings
    ##
    access_log /var/log/nginx/access.log;

    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/x-js text/x-cross-domain-policy application/x-font-ttf application/x-font-opentype application/vnd.ms-fontobject image/x-icon;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}

# RTMP Configuration
rtmp {
    server {
        listen 1935;
        chunk_size 4096;
        
        # Увеличиваем буферы для стабильности
        max_message 64M;
        buflen 5s;
        
        application live {
            live on;
            
            # HLS настройки - оптимизированы для мобильных и стабильности
            hls on;
            hls_path /srv/streaming/live;
            
            # Короткие фрагменты для быстрого старта на мобильных
            hls_fragment 2s;
            
            # Длинный плейлист для буферизации
            hls_playlist_length 60s;
            
            # Важные настройки для стабильности
            hls_continuous on;      # Непрерывная нумерация сегментов
            hls_cleanup on;         # Автоочистка старых сегментов
            hls_nested off;         # Все файлы в одной папке
            hls_sync 100ms;         # Точная синхронизация времени
            
            # Дополнительные настройки HLS
            hls_type live;          # Живой стрим
            
            # Настройки записи (отключены для тестирования)
            # record all;
            # record_path /srv/streaming/archive;
            # record_suffix .flv;
            # record_unique on;
            
            # Критически важные настройки для стабильности
            drop_idle_publisher 0;  # НЕ отключать издателя при простое
            idle_streams off;       # НЕ закрывать неактивные потоки
            sync 300ms;            # Синхронизация аудио/видео
            interleave on;         # Чередование аудио/видео пакетов
            wait_key on;           # Ждать ключевой кадр перед началом
            wait_video on;         # Ждать видео перед началом записи
            
            # Кэширование для быстрого подключения
            gop_cache on;          # Кэш GOP (группа изображений)
            
            # Разрешения
            allow publish all;     # Разрешаем публикацию всем
            allow play all;        # Разрешаем просмотр всем
            
            # Метаданные
            meta copy;             # Копировать метаданные из источника
        }
    }
}
NGINX_CONFIG

echo "🔍 Тестирование новой конфигурации..."
nginx -t -c /tmp/nginx-new.conf
if [ $? -ne 0 ]; then
    echo "❌ Ошибка в новой конфигурации!"
    echo "Конфигурация НЕ применена."
    exit 1
fi

echo "✅ Конфигурация корректна"
echo ""
echo "📝 Применение конфигурации..."
cp /tmp/nginx-new.conf /etc/nginx/nginx.conf

echo "🔄 Перезагрузка nginx..."
systemctl reload nginx
sleep 2

if systemctl is-active nginx > /dev/null; then
    echo "✅ nginx успешно перезагружен"
else
    echo "❌ Ошибка при перезагрузке nginx!"
    echo "Восстановление из резервной копии..."
    cp "$BACKUP_DIR/nginx.conf.backup" /etc/nginx/nginx.conf
    systemctl restart nginx
    exit 1
fi

echo ""
echo "🧹 Очистка старых файлов..."
rm -rf /srv/streaming/live/*.m3u8 /srv/streaming/live/*.ts
rm -rf /srv/streaming/live/main/*
mkdir -p /srv/streaming/live/main
chown -R www-data:www-data /srv/streaming/
chmod -R 755 /srv/streaming/

echo ""
echo "🚀 Запуск HLS монитора..."
if [ -f "/usr/local/bin/hls-monitor.sh" ]; then
    /usr/local/bin/hls-monitor.sh restart
    echo "✅ HLS монитор перезапущен"
else
    echo "⚠️ HLS монитор не найден"
fi

echo ""
echo "======================================"
echo "✅ КОНФИГУРАЦИЯ УСПЕШНО ПРИМЕНЕНА!"
echo "======================================"
echo ""
echo "📊 Изменения:"
echo "  • Оптимизирована буферизация для мобильных"
echo "  • Настроена стабильная HLS конвертация"
echo "  • Отключено прерывание неактивных потоков"
echo "  • Улучшена синхронизация аудио/видео"
echo ""
echo "🎯 Теперь запустите стрим из OBS:"
echo "  • Сервер: rtmp://185.200.178.73/live"
echo "  • Ключ: main"
echo ""
echo "📱 Стрим должен работать стабильно на:"
echo "  • iOS Safari"
echo "  • Android Chrome"
echo "  • Десктоп браузерах"
EOF
