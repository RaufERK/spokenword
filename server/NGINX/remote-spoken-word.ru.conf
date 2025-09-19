# /etc/nginx/sites-available/spoken-word.ru

# 1) HTTP: ACME + редирект → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name spoken-word.ru www.spoken-word.ru;

    # для certbot renew
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type "text/plain";
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# 2) HTTPS: основной сайт (Только spoken-word.ru + www)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name spoken-word.ru www.spoken-word.ru;

    ssl_certificate     /etc/letsencrypt/live/spoken-word.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spoken-word.ru/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 8G;

    # общий CORS (если нужен шире — оставь так)
    add_header Access-Control-Allow-Origin "*" always;

    # ─ HLS/видео ─
    location /live/ {
        alias /srv/streaming/live/;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        add_header Surrogate-Control "no-store" always;
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Range, Content-Type";
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range";
        add_header Access-Control-Max-Age "86400";
        
        # Обработка OPTIONS запросов для CORS
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Range, Content-Type";
            add_header Access-Control-Max-Age "86400";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        types { 
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        proxy_buffering off;
        etag off;
        if_modified_since off;
        expires -1;
    }

    location /archive/ {
        alias /srv/streaming/archive/;
        add_header Cache-Control "no-cache";
    }

    location /conf/ {
        alias /srv/streaming/conf/;
        add_header Cache-Control "no-cache";
        types { application/vnd.apple.mpegurl m3u8; video/mp2t ts; }
        proxy_buffering off;
    }

    location /conf-arch/ {
        alias /srv/streaming/conf-arch/;
        add_header Cache-Control "no-cache";
        add_header Access-Control-Allow-Origin "*";
    }

    # новый путь к conf-archive (как на новом сервере)
    location /conf-archive/ {
        alias /home/appuser/apps/spokenword/current/public/conf-archive/;
        add_header Cache-Control "no-cache";
        add_header Access-Control-Allow-Origin "*";
    }

    # ─ AUDIO HLS ─
    location /audio/ {
        alias /srv/streaming/audio/;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        add_header Surrogate-Control "no-store" always;
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Range, Content-Type" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range" always;
        add_header Access-Control-Max-Age "86400" always;

        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Range, Content-Type";
            add_header Access-Control-Max-Age "86400";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        proxy_buffering off;
        etag off;
        if_modified_since off;
        expires -1;
    }

	# тот же каталог под /watch-conf/
	location /watch-conf/ {
	    alias /home/appuser/apps/spokenword/current/public/conf-archive/;

	    # правильные MIME-типы для плеера в браузере
	    types {
	        video/mp4                       mp4 m4v;
	        video/webm                      webm;
	        video/quicktime                 mov;
	        application/vnd.apple.mpegurl   m3u8;
	        video/mp2t                      ts;
	        audio/mp4                       m4a;
	    }

	    # проигрывание "в браузере", а не скачивание
	    add_header Content-Disposition "inline" always;

	    # удобно для HLS/плееров
	    add_header Access-Control-Allow-Origin "*" always;
	    add_header Cache-Control "no-cache" always;

	    # для статики через alias проксирование не нужно
	    # proxy_buffering off;  # не требуется
	    gzip off;               # на всякий случай не сжимать видео
	}


    # ─ Прокси на Next.js (3005) ─
    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;

        proxy_set_header Host               $host;
        proxy_set_header X-Real-IP          $remote_addr;
        proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  https;

        proxy_set_header Upgrade            $http_upgrade;
        proxy_set_header Connection         "upgrade";

        proxy_read_timeout 600;
        proxy_send_timeout 600;
        proxy_buffering off;
    }

    gzip on;
    gzip_types text/css application/javascript application/json application/xml text/plain image/svg+xml;

    access_log /var/log/nginx/spoken_word_access.log;
    error_log  /var/log/nginx/spoken_word_error.log;
}
