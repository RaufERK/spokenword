# 🔧 Исправление проблемы "холодного старта" стрима

## Проблема
При запуске стрима первые 10-30 секунд: буферизация, обрывы, зависания.
После прогрева всё работает стабильно.

## Причины

### 1. Малый буфер сегментов
- **Текущее:** `hls_window: 6` (12 секунд буфера)
- **Проблема:** Клиент начинает воспроизведение когда есть 4 сегмента (8 сек), этого мало

### 2. Ожидание ключевого кадра
- **Текущее:** `hls_wait_keyframe: on`
- **Проблема:** SRS ждёт первый keyframe от OBS, задержка 2-4 секунды

### 3. API показывает isLive слишком рано
- **Текущее:** isLive=true когда `segmentCount >= 4`
- **Проблема:** 4 сегмента недостаточно для стабильного воспроизведения

### 4. HLS.js клиент агрессивен
- **Текущее:** `maxBufferLength: 20`, `liveSyncDuration: 3`
- **Проблема:** Пытается начать воспроизведение сразу, не набрав буфер

---

## ✅ Решение 1: Увеличить буфер на сервере (ГЛАВНОЕ)

### На сервере: `/etc/srs/srs.conf`

```conf
vhost __defaultVhost__ {
    hls {
        enabled         on;
        hls_path        /var/lib/srs/hls;
        hls_fragment    2;
        hls_window      10;           # Было: 6 → Стало: 10 (20 сек буфера)
        hls_cleanup     on;
        hls_dispose     3;
        hls_wait_keyframe off;        # Было: on → Стало: off ⚠️ ВАЖНО!
    }
}
```

**Изменения:**
- `hls_window: 6 → 10` — увеличиваем до 20 секунд буфера
- `hls_wait_keyframe: off` — не ждём первый keyframe, начинаем сразу

**Применить:**
```bash
sudo nano /etc/srs/srs.conf
# Изменить hls_window и hls_wait_keyframe

sudo systemctl restart srs
sudo systemctl status srs
```

---

## ✅ Решение 2: API не показывает isLive до накопления буфера

### Файл: `app/api/stream-status/route.ts`

**Текущее:**
```typescript
const isWarmingUp = segmentCount < 4 || tsFiles.length < 3
```

**Изменить на:**
```typescript
// Стрим считается "прогретым" только когда есть минимум 8 сегментов (16 сек)
const isWarmingUp = segmentCount < 8 || tsFiles.length < 6

// И не показываем isLive пока не прогрелся
const isLive = fileAge < 30000 && stats.size > 0 && !isWarmingUp
```

**Эффект:** Пользователи увидят "Трансляция не ведётся" пока стрим прогревается

---

## ✅ Решение 3: Клиент набирает больший начальный буфер

### Файл: `components/HlsPlayer.tsx`

**Текущее:**
```typescript
maxBufferLength: 20,
liveSyncDuration: 3,
```

**Изменить на:**
```typescript
maxBufferLength: 30,          // Было: 20 → 30 секунд
maxMaxBufferLength: 60,       // Было: 40 → 60 секунд
liveSyncDuration: 5,          // Было: 3 → 5 секунд (отстаём от лайва)
liveMaxLatencyDuration: 15,   // Было: 10 → 15 секунд
```

**Эффект:** Клиент набирает больший буфер перед стартом

---

## ✅ Решение 4: Задержка показа "isLive"

### Файл: `app/live/page.tsx`

**Добавить логику:**
```typescript
const [streamUrl, setStreamUrl] = useState<string>('')
const [isLive, setIsLive] = useState<boolean>(false)
const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false)

useEffect(() => {
  const load = async () => {
    try {
      const res = await fetch(`/api/stream-status?key=main`)
      const data = await res.json()
      
      // Показываем "прогрев" если есть сегменты но их мало
      if (data.isLive && data.isWarmingUp) {
        setIsWarmingUp(true)
        setIsLive(false)
      } else {
        setIsLive(Boolean(data.isLive))
        setIsWarmingUp(false)
      }
      
      setStreamUrl(
        data.isLive && !data.isWarmingUp 
          ? `https://spoken-word.ru/hls/live/main.m3u8` 
          : ''
      )
    } catch {
      setIsLive(false)
      setIsWarmingUp(false)
      setStreamUrl('')
    }
  }

  load()
  const id = setInterval(load, 5000) // Проверяем каждые 5 сек
  return () => clearInterval(id)
}, [])

// В return добавить состояние "прогрев"
{isWarmingUp && (
  <div className='w-full aspect-video flex items-center justify-center bg-gray-900'>
    <div className='text-center px-6'>
      <div className='animate-pulse'>
        <div className='w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
        <h3 className='text-xl font-semibold text-gray-200 mb-2'>
          Стрим запускается...
        </h3>
        <p className='text-gray-400'>
          Накапливаем буфер для стабильного воспроизведения
        </p>
      </div>
    </div>
  </div>
)}
```

---

## 📊 План тестирования

### Подготовка (делаем сейчас):

1. **Останови стрим в OBS**
2. **Я создам скрипт мониторинга** который будет логировать:
   - Когда создаётся первый .m3u8
   - Сколько сегментов накапливается
   - Когда API начинает отдавать isLive
   - Логи SRS в реальном времени

### Тестирование:

1. **Запускаем мониторинг** (я дам команду)
2. **Ты запускаешь стрим в OBS**
3. **Скрипт логирует всё что происходит**
4. **Анализируем логи** и видим где именно проблема

---

## 🎯 Рекомендуемый порядок применения

### Быстрое исправление (2 минуты):
1. **Решение 2** — изменить API (не показывать isLive пока не прогрелся)
2. **Решение 3** — увеличить буфер в HLS.js клиенте

### Полное исправление (5 минут на сервере):
1. **Решение 1** — изменить SRS конфиг (hls_window=10, hls_wait_keyframe=off)
2. **Решение 2** — API
3. **Решение 3** — HLS.js клиент
4. **Решение 4** — UI для прогрева (опционально)

---

## ⚠️ Важные замечания

### hls_wait_keyframe: off - почему это безопасно?

- **Было:** SRS ждёт первый keyframe, задержка начала стрима
- **Стало:** SRS начинает сразу, может первый сегмент быть неполным
- **Эффект:** Первые 2 секунды могут быть некрасивыми, но зато стрим стартует сразу
- **В OBS:** У нас keyframe interval = 2 сек, так что максимум 2 сек ожидания

### hls_window: 10 - не слишком ли много?

- **10 сегментов × 2 сек = 20 секунд буфера**
- **Диск:** ~10 файлов по 200-500 KB = ~2-5 MB (ничтожно)
- **Задержка лайва:** 10-15 секунд (приемлемо для HLS)
- **Стабильность:** +++++ (отлично)

---

Готов создать скрипт мониторинга?

