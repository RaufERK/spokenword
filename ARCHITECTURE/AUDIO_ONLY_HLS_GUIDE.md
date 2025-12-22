# 🎵 Audio-only HLS Track - Подробный гайд

## 🎯 ЧТО ЭТО ТАКОЕ:

**Audio-only HLS track** - это отдельный уровень (variant) в HLS плейлисте, который содержит **ТОЛЬКО аудио**, без видео-дорожки.

### Зачем это нужно:
✅ Экономия трафика (128 kbps vs 700+ kbps)  
✅ Стабильнее на медленном интернете  
✅ Работает с блокировкой экрана на мобилках  
✅ Браузер понимает что это "музыка", не "видео"  
✅ Меньше нагрузка на CPU/батарею  

---

## 📦 КАК ЭТО РАБОТАЕТ:

### Обычный HLS (сейчас):
```
OBS → SRS → HLS (видео 720p + аудио)
         ↓
    Пользователи получают видео+аудио
    (даже если слушают только аудио)
```

### С Audio-only track:
```
OBS → SRS → HLS видео (720p + аудио)
         ↓
      FFmpeg транскодинг
         ↓
    ├─ HLS видео (360p + аудио) 
    └─ HLS audio-only (только аудио)
         ↓
    Пользователи выбирают:
    - /live → видео+аудио
    - /audio → ТОЛЬКО аудио (меньше трафика)
```

---

## ⚙️ КОНФИГУРАЦИЯ SRS:

### В `/etc/srs/srs.conf`:

```conf
vhost __defaultVhost__ {
    transcode {
        enabled     on;
        ffmpeg      /usr/local/bin/ffmpeg;
        
        # Существующий транскодинг видео 360p
        engine low360 {
            enabled         on;
            vcodec          libx264;
            vprofile        baseline;
            vpreset         veryfast;
            vfps            25;
            vbitrate        700;
            vwidth          640;
            vheight         360;
            acodec          aac;
            abitrate        96;
            asample_rate    44100;
            achannels       2;
            output          rtmp://127.0.0.1:[port]/[app]/[stream]_360?vhost=transcoded;
        }
        
        # 🆕 НОВЫЙ: Audio-only транскодинг
        engine audio_only {
            enabled         on;
            vcodec          vn;           # vn = без видео
            acodec          aac;
            abitrate        128;          # 128 kbps для аудио
            asample_rate    44100;
            achannels       2;
            output          rtmp://127.0.0.1:[port]/[app]/[stream]_audio?vhost=audio;
        }
    }
    
    hls {
        enabled         on;
        hls_path        /var/lib/srs/hls;
        hls_fragment    2;
        hls_window      20;
        hls_cleanup     on;
        hls_wait_keyframe off;
    }
}

# Отдельный vhost для audio-only
vhost audio {
    hls {
        enabled         on;
        hls_path        /var/lib/srs/hls;
        hls_fragment    2;
        hls_window      20;
        hls_cleanup     on;
        hls_dispose     3;
        hls_wait_keyframe off;
        hls_m3u8_file   [app]/audio.m3u8;      # Отдельный плейлист
        hls_ts_file     [app]/audio-[seq].ts;   # Отдельные сегменты
    }
}
```

### Результат на сервере:
```
/var/lib/srs/hls/live/
├── main.m3u8          # Видео 720p + аудио (оригинал)
├── main-*.ts
├── audio.m3u8         # 🆕 ТОЛЬКО аудио
└── audio-*.ts         # 🆕 Аудио сегменты
```

---

## 💻 ИЗМЕНЕНИЯ В КОДЕ:

### В `app/audio/page.tsx`:

**БЫЛО:**
```typescript
setStreamUrl(data.isLive ? 'https://spoken-word.ru/hls/live/main.m3u8' : '')
```

**СТАНЕТ:**
```typescript
setStreamUrl(data.isLive ? 'https://spoken-word.ru/hls/live/audio.m3u8' : '')
//                                                             ^^^^^ audio-only!
```

### Всё остальное БЕЗ ИЗМЕНЕНИЙ!
- AudioHlsPlayer остаётся как есть
- Логика та же
- Только URL меняется

---

## 📊 СРАВНЕНИЕ ПОТОКОВ:

### Видео поток (main.m3u8):
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-TARGETDURATION:2
#EXTINF:2.000, no desc
main-100.ts    # Видео H.264 + Аудио AAC, ~175 KB
#EXTINF:2.000, no desc
main-101.ts    # Видео H.264 + Аудио AAC, ~175 KB
...
```

**Размер:** ~350 KB на 2 сегмента (4 секунды) = **700 kbps**

### Audio-only поток (audio.m3u8):
```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:100
#EXT-X-TARGETDURATION:2
#EXTINF:2.000, no desc
audio-100.ts   # ТОЛЬКО Аудио AAC, ~32 KB
#EXTINF:2.000, no desc
audio-101.ts   # ТОЛЬКО Аудио AAC, ~32 KB
...
```

**Размер:** ~64 KB на 2 сегмента (4 секунды) = **128 kbps**

**ЭКОНОМИЯ ТРАФИКА: 5.5 раз!** 📉

---

## 🔧 ПРЕИМУЩЕСТВА AUDIO-ONLY:

### 1. **Меньше трафика:**
```
Видео: 700 kbps × 3600 сек = 315 MB/час
Аудио: 128 kbps × 3600 сек = 57 MB/час
```

### 2. **Стабильнее на плохом интернете:**
- Меньше данных → меньше обрывов
- Быстрее прогрев (меньше буфер)

### 3. **Работает с lockscreen:**
Браузер видит чисто аудио-поток → включает Media Session → показывает плеер на заблокированном экране

### 4. **Меньше нагрузка:**
- Не нужно декодировать видео
- Экономия батареи на мобилках

---

## 🚀 ПРИМЕНЕНИЕ (ПОШАГОВО):

### 1. Бэкап конфига:
```bash
ssh amster "sudo cp /etc/srs/srs.conf /etc/srs/srs.conf.backup-audio-only"
```

### 2. Редактировать `/etc/srs/srs.conf`:
```bash
ssh amster "sudo nano /etc/srs/srs.conf"
# Добавить engine audio_only и vhost audio
```

### 3. Проверить конфиг:
```bash
ssh amster "/opt/srs/srs -t -c /etc/srs/srs.conf"
```

### 4. Перезапустить SRS:
```bash
ssh amster "sudo systemctl restart srs"
```

### 5. Проверить что появился audio.m3u8:
```bash
# Через ~10 секунд после старта стрима
curl -s "https://spoken-word.ru/hls/live/audio.m3u8"
```

### 6. Изменить код:
```typescript
// app/audio/page.tsx
setStreamUrl('https://spoken-word.ru/hls/live/audio.m3u8')
```

### 7. Деплой:
```bash
npm run build
npm run deploy
```

---

## 📱 ЧТО ИЗМЕНИТСЯ ДЛЯ ПОЛЬЗОВАТЕЛЯ:

### НА СТРАНИЦЕ `/live`:
- Ничего не меняется
- Видео 720p + аудио как обычно

### НА СТРАНИЦЕ `/audio`:
- **Быстрее загружается** (меньше данных)
- **Стабильнее играет** (меньше требований к сети)
- **Работает при блокировке** (Media Session API)
- **Экономит трафик** (важно для мобильного интернета)

---

## ⚠️ ВАЖНО:

### FFmpeg команда будет:
```bash
# SRS запустит два FFmpeg процесса:

# 1. Видео 360p (как сейчас)
ffmpeg -i rtmp://127.0.0.1/live/main \
  -vcodec libx264 -vbitrate 700k -s 640x360 \
  -acodec aac -abitrate 96k \
  -f flv rtmp://127.0.0.1/live/main_360?vhost=transcoded

# 2. 🆕 Audio-only
ffmpeg -i rtmp://127.0.0.1/live/main \
  -vn \                    # Без видео!
  -acodec aac -abitrate 128k \
  -f flv rtmp://127.0.0.1/live/main_audio?vhost=audio
```

**Нагрузка:** +15-20% CPU (один дополнительный FFmpeg)

---

## 🎯 ИТОГО:

**Audio-only HLS track - это:**
- ✅ Отдельный аудио-поток через SRS
- ✅ Без видео-дорожки (меньше трафик)
- ✅ Работает с lockscreen (Media Session)
- ✅ Всё через HLS (единая система)
- ✅ Не нужен Icecast

**Минус:**
- ❌ Нужно настроить SRS (добавить engine)
- ❌ Чуть больше нагрузка на сервер

**НО это ЛУЧШЕ чем Icecast** потому что:
- Всё в одной системе (SRS)
- Одинаковая задержка для видео и аудио
- Проще поддерживать

---

## 🚀 СЕЙЧАС:

Я сделал **Шаг 1** (быстрые фиксы). Давай **протестируем!**

Если аудио всё ещё плохо работает → переходим к **Шагу 3** (audio-only track).

**Согласен?**

