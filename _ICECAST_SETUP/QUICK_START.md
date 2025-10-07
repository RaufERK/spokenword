# ⚡ Быстрый старт — Icecast для аудио

## 📋 Чек-лист установки (15 минут)

### ☐ 1. Загрузить файлы на сервер (2 мин)

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/_ICECAST_SETUP
scp -r * amster:/root/icecast-setup/
```

---

### ☐ 2. Запустить установку (3 мин)

```bash
ssh amster
cd /root/icecast-setup
chmod +x *.sh
sudo ./install-icecast.sh
```

✅ Пароли сохранятся в `/root/icecast-passwords.txt`

---

### ☐ 3. Обновить nginx — RTMP блок (2 мин)

```bash
sudo nano /etc/nginx/nginx.conf
```

В блок `application live` **добавить 2 строки**:

```nginx
exec_publish /usr/local/bin/start-icecast-audio.sh $name;
exec_publish_done /usr/local/bin/stop-icecast-audio.sh $name;
```

---

### ☐ 4. Обновить nginx — HTTP блок (2 мин)

```bash
sudo nano /etc/nginx/sites-available/spoken-word.ru
```

**Добавить внутри `server { ... }`:**

```nginx
location /audio-stream/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "no-cache";
}
```

---

### ☐ 5. Перезагрузить nginx (1 мин)

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### ☐ 6. Деплой frontend (3 мин)

```bash
# На локальной машине
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD
git add .
git commit -m "feat: migrate audio to Icecast"
git push
npm run deploy
```

---

### ☐ 7. Тест (2 мин)

1. Запустить стрим в OBS
2. Открыть https://spoken-word.ru/audio
3. Проверить что звук работает

---

## ✅ Готово!

Аудио теперь работает через Icecast:
- ✅ Задержка < 2 секунд
- ✅ Стабильно на мобильных
- ✅ Простой плеер

---

## 📄 Полная документация

Читай `README.md` для детальных инструкций.











