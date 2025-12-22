# ⚡ Быстрый старт исправления

**Когда вернетесь - выполнить по порядку:**

## 1️⃣ Исправить права (2 минуты)
```bash
ssh amster 'sudo mkdir -p /opt/srs/objs /var/lib/srs/hls/live && sudo chown -R srs:srs /opt/srs/objs /var/lib/srs/hls && sudo chmod 755 /opt/srs/objs /var/lib/srs/hls'
```

## 2️⃣ Включить транскодинг (3 минуты)
```bash
ssh amster 'sudo sed -i "s/transcode {/transcode {/; /transcode {/,/^    }/ s/enabled     off;/enabled     on;/" /etc/srs/srs.conf && sudo systemctl restart srs'
```

## 3️⃣ Проверить (1 минута)
```bash
ssh amster 'sudo systemctl status srs --no-pager | head -20'
```

## 4️⃣ Включить стрим и наблюдать
```bash
# В отдельном терминале
ssh amster 'sudo journalctl -u srs -f'

# Включить стрим в OBS
# Открыть https://spoken-word.ru/live
```

---

**Полный план:** `STREAM_FIX_PLAN.md`

**Проблемы?** Пишите - разберемся! 🚀

