NGINX
cat /usr/local/nginx/conf/nginx.conf
nginx /usr/local/nginx/conf/nginx.conf


sudo nano /etc/nginx/nginx.conf


файлы со скриптами: /usr/local/bin/
ls -lh /usr/local/bin/

/usr/local/bin/start-hls.sh
/usr/local/bin/record-archive.sh
/usr/local/bin/after-archive.sh


SPOKENWORD
su - appuser
cd /var/www/spokenword/source

Темплйт-UNITS
ls -lh /etc/systemd/system/

/etc/systemd/system/hls-worker@.service
/etc/systemd/system/stream-archive@.service
/etc/systemd/system/after-archive@.service

Следим:
# «Хвост» HLS-процесса
tail -f /srv/streaming/live/ITMUG2025-ffmpeg.log

# «Хвост» архива
tail -f /srv/streaming/archive/ITMUG2025-rec.log


clear && date && tail -f /var/log/nginx/error_rtmp.log

NGINX
/var/log/nginx/error_rtmp.log


| Что хотим увидеть                          | Команда                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Живые события systemd** (старты/падения) | `journalctl -u hls-worker@ITMUG2025 -u stream-archive@ITMUG2025 -f`                     |
| **FFmpeg-транскодер**                      | `tail -f /srv/streaming/live/ITMUG2025-ffmpeg.log`                                      |
| **FFmpeg-архиватор**                       | `tail -f /srv/streaming/archive/ITMUG2025-rec.log`                                      |
| **FFmpeg-конвертер после окончания**       | `tail -f /srv/streaming/archive/ITMUG2025-rec.log` (те же файлы, скрипт пишет в них же) |


# live (free)
tail -f /srv/streaming/live/*-ffmpeg.log

# live (paid)
tail -f /srv/streaming/users-live/*-ffmpeg.log

# архивы пишет
tail -f /srv/streaming/archive/*-rec.log \
        /srv/streaming/users-archive/*-rec.log

# перезапуски юнитов
journalctl -u hls-worker@KEY -u stream-archive@KEY -f
