nano /etc/nginx/sites-available/spokenword

sudo ln -s /etc/nginx/sites-available/spokenword /etc/nginx/sites-enabled/

**юнит для nginx**

/etc/systemd/system/nginx-rtmp.service

**RTMP-сервер**
/etc/rtmp-nginx/nginx.conf

**папки:**
/etc/rtmp-nginx
/var/log/nginx-rtmp

/var/log/nginx-rtmp/error.log

**SPOKENWORD**
/etc/nginx/sites-available/spokenword
cat /etc/nginx/sites-available/spokenword



**ЛОГИ ЛЕЖИТ ТУТ:**

/etc/rtmp-nginx/logs/


**ПЕРЕЗАГРУЗКА ЮНИТА:**

sudo systemctl daemon-reload
sudo systemctl restart nginx-rtmp
sudo systemctl status nginx-rtmp
