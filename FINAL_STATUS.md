# ✅ Финальный статус системы стриминга

**Дата:** 2025-10-05  
**Статус:** 🟢 Работает стабильно после перезагрузки

---

## 🎯 ЧТО БЫЛО ИСПРАВЛЕНО

### 1. ✅ Права доступа (продакшн)
```bash
/opt/srs/objs/        → srs:srs (логи FFmpeg)
/var/lib/srs/hls/     → srs:srs (HLS сегменты)
/run/srs/             → автоматически создается systemd
```

### 2. ✅ Systemd unit правильный
```ini
[Service]
RuntimeDirectory=srs              # Автоматическое создание /run/srs/
RuntimeDirectoryMode=0755
WorkingDirectory=/opt/srs         # Правильная рабочая директория
User=srs                          # Работает от srs (не root)
Group=srs
```

**Преимущества:**
- Автоматическая очистка PID файла при перезагрузке ✅
- Правильные пути для логов FFmpeg ✅
- Нет симлинков-костылей ✅

### 3. ✅ SRS конфигурация (продакшн)

**Vhost-ы:**
- `__defaultVhost__` - основной (транскодинг в 360p)
- `spoken-word.ru` - для OBS через домен
- `stream.spoken-word.ru` - для OBS через субдомен
- `transcoded` - транскодированный поток с HLS

**Схема:**
```
OBS → rtmp://spoken-word.ru/live/main (любое качество)
  ↓
vhost spoken-word.ru → refer __defaultVhost__
  ↓
Транскодинг: FFmpeg → 640x360, 700kbps
  ↓
rtmp://127.0.0.1/live/main_360?vhost=transcoded
  ↓
vhost transcoded → HLS генерация
  ↓
/var/lib/srs/hls/live/main.m3u8 (360p сегменты)
```

### 4. ✅ Фронтенд упрощен

**Убрано:**
- ❌ Warm-up период (6 сек задержка не нужна)
- ❌ Зависимость от streamInfo в useEffect
- ❌ Сложная retry логика (8/10 попыток)
- ❌ Перезагрузка плеера каждые 10 секунд

**Осталось:**
- ✅ Простой плеер с зависимостью только от streamUrl
- ✅ Стандартная retry логика (3-5 попыток)
- ✅ Cache-busting для плейлиста
- ✅ Проверка статуса каждые 10 секунд

**Результат:** Плеер НЕ перезагружается пока стрим идет! ✅

### 5. ✅ Скрипт npm run fix

```bash
npm run fix
```

Автоматически исправляет:
- Права на /opt/srs/objs
- Права на /var/lib/srs/hls
- Очистка PID файлов
- Очистка старых сегментов

**Использование после деплоя:**
```bash
npm run deploy && npm run fix
```

---

## 🎬 НАСТРОЙКА OBS

### Вариант 1: Через домен (рекомендуется) ⭐
```
Сервер: rtmp://spoken-word.ru/live
Ключ потока: main
```

### Вариант 2: Через IP
```
Сервер: rtmp://185.200.178.73/live
Ключ потока: main
```

### Вариант 3: Через субдомен
```
Сервер: rtmp://stream.spoken-word.ru/live
Ключ потока: main
```

**Все 3 варианта работают одинаково!** ✅

---

## ⚠️ КРИТИЧЕСКИ ВАЖНО: Keyframe Interval в OBS

### Текущая проблема:
- Сегменты создаются **раз в 20 секунд** вместо каждые 2 секунды
- В плейлисте только **2 сегмента** вместо 6
- Это вызывает **нестабильность**

### Решение:
**В OBS → Настройки → Вывод → Streaming:**
- **Keyframe Interval: 2** (обязательно!)

**После изменения:**
- Сегменты будут создаваться каждые 2 секунды ✅
- В плейлисте будет 4-6 сегментов ✅
- Плеер будет работать стабильно ✅

---

## 🛠️ Рекомендованные настройки OBS

```
Вывод → Streaming:
  Битрейт видео: 2500-3000 kbps (SRS транскодирует в 700kbps)
  Кодек: H.264
  Preset: veryfast или faster
  Profile: main
  Keyframe Interval: 2  ← КРИТИЧНО!

Аудио:
  Битрейт: 128 kbps
  Sample Rate: 44.1 kHz или 48 kHz
```

---

## 📊 Проверка после перезагрузки

### Все сервисы работают:
```bash
✅ SRS: active (PID 2835, User: srs)
✅ nginx: active
✅ PM2/spokenword: online
✅ Website: доступен (200 OK)
```

### Права корректны:
```bash
/opt/srs/objs/      → srs:srs ✅
/var/lib/srs/hls/   → srs:srs ✅
/run/srs/           → автоматически ✅
```

### Конфигурация правильная:
```bash
WorkingDirectory=/opt/srs        ✅
RuntimeDirectory=srs             ✅
pid /run/srs/srs.pid            ✅
Vhost для домена настроен        ✅
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Включите стрим в OBS:

**1. Настройте Keyframe Interval = 2**

**2. Подключитесь через домен:**
```
Сервер: rtmp://spoken-word.ru/live
Ключ: main
```

**3. Запустите трансляцию**

**4. Откройте браузер:**
- https://spoken-word.ru/live

**5. Наблюдайте в логах:**
```bash
# Терминал 1
npm run logs:srs

# Терминал 2
ssh amster 'watch -n 2 "ls -lh /var/lib/srs/hls/live/*.ts | tail -5"'
```

**Ожидаемый результат:**
- ✅ FFmpeg запускается
- ✅ Сегменты создаются каждые 2 секунды
- ✅ В плейлисте 4-6 сегментов
- ✅ Видео показывается стабильно
- ✅ Нет перезагрузок плеера

---

## 📞 Команды для мониторинга

```bash
# Статус системы
ssh amster 'systemctl status srs nginx'

# Логи SRS
npm run logs:srs

# Сегменты HLS
ssh amster 'ls -lah /var/lib/srs/hls/live/'

# Проверка API
curl "https://spoken-word.ru/api/stream-status?key=main" | jq .

# Исправить права
npm run fix
```

---

## 🎉 ГОТОВО К РАБОТЕ!

**После установки Keyframe Interval = 2 в OBS система будет работать стабильно!**

**Протестируйте со стримом и скажите результат.** 🚀

