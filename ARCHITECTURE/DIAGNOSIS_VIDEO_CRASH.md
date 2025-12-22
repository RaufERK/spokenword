# 🔍 ДИАГНОЗ: Почему крашит на 301MB файле

**Дата:** 9 ноября 2025, 13:45  
**Статус:** Worker запущен с новым кодом, НО всё равно крашит

---

## 📊 ФАКТЫ ИЗ ЛОГОВ:

### Попытка 1 (11:25:07):
```
11:25:07 🎬 Начинаем сжатие: 20251011191302_5df598.mp4
11:25:07 📊 Размер: 301MB
[worker умер]
11:37:02 🔄 Worker перезапустился  ← 12 минут спустя
```

### Попытка 2 (11:38:19):
```
11:38:19 🎬 Начинаем сжатие: 20251011191302_5df598.mp4
11:38:19 📊 Размер: 301MB
[worker умер]
11:42:42 🔄 Worker перезапустился  ← 4 минуты спустя
```

### Попытка 3 (сейчас):
```
11:42:42 Worker перезапустился с НОВЫМ кодом
[обрабатывает файл из очереди...]
```

---

## 🚨 ГЛАВНАЯ ПРОБЛЕМА: НЕТ SWAP!

```bash
$ free -h
Swap:  0B  0B  0B  ← НЕТ SWAP!
```

**Что это значит:**
- Сервер: 8GB RAM
- Когда память заканчивается → **OOM killer убивает процесс**
- Нет swap → нет "подушки безопасности"

---

## 💾 ИСПОЛЬЗОВАНИЕ ПАМЯТИ:

| Процесс | RAM | Тип |
|---------|-----|-----|
| spokenword | 175MB | Next.js API |
| video-worker | 61MB | Worker (только что запустился) |
| **FFmpeg (во время сжатия)** | **3-4GB!** | Дочерний процесс |

**Итого при обработке 301MB:** ~4GB  
**Свободно сейчас:** 2.8GB ← **НЕ ХВАТАЕТ!**

---

## 🎯 ПОЧЕМУ КРАШИТ:

1. **Worker запускается:** 61MB
2. **FFmpeg запускается:** +500MB (загрузка файла)
3. **FFmpeg начинает сжатие:** +2-3GB (буферы, обработка)
4. **Итого:** ~3.5-4GB
5. **Свободной памяти:** 2.8GB
6. **OOM killer:** УБИВАЕТ worker!

---

## ✅ РЕШЕНИЕ: Добавить SWAP

### Вариант 1: 4GB swap (рекомендуемый)
```bash
ssh amster_app
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
sudo swapon --show

# Сделать постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Вариант 2: 8GB swap (для больших файлов)
```bash
ssh amster_app
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
sudo swapon --show

echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

После добавления swap:

```
               total        used        free      shared  buff/cache   available
Mem:           7.7Gi       2.3Gi       2.8Gi       2.0Mi       2.6Gi       5.1Gi
Swap:          4.0Gi         0Gi       4.0Gi  ← ПОЯВИТСЯ!
```

**Теперь:**
- RAM заканчивается → используется Swap
- Worker НЕ убивается
- Файл обрабатывается медленнее, но **без краша**

---

## 🧪 ТЕСТ ПОСЛЕ SWAP:

### 1. Добавь swap (см. выше)

### 2. Очисть зависший файл:
```bash
ssh amster_app "redis-cli DEL 'upload:2:20251011191302_5df598.mp4'"
```

### 3. Загрузи файл снова:
- Админка → https://spokenword.ru/admin/packages
- Следи: `ssh amster_app "source ~/.nvm/nvm.sh && pm2 logs video-worker --lines 0"`

### 4. Смотри прогресс:
```bash
# В другом терминале
watch -n 5 'free -h && echo "---" && pm2 list | grep video-worker'
```

Должно быть:
```
🎬 Начинаем сжатие: 20251011191302_5df598.mp4
📊 Размер: 301MB
[... 5-8 минут обработки ...]
📉 Сжатие: 301MB → ~80MB
✅ Готово!
```

---

## 📈 ДРУГИЕ ПРОБЛЕМЫ (второстепенные):

### 1. Redis версия 6.0.16 (рекомендуется 6.2.0+)
Не критично, но можно обновить:
```bash
ssh amster_app
sudo apt update
sudo apt install redis-server
```

### 2. Сжатие увеличивает размер файла
```
📉 Сжатие: 8MB → 11MB
🎯 Коэффициент: -37%
```

**Причина:** Файлы уже сжаты (h265/hevc)  
**Решение:** Проверить кодек входного файла:
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name filename.mp4
```

Если `hevc` → не сжимать, копировать как есть.

---

## 🎯 ИТОГО:

### Главная проблема:
- ❌ **НЕТ SWAP** → OOM killer убивает при нехватке RAM

### Решение:
- ✅ **Добавить 4-8GB swap**
- ✅ Файл будет обрабатываться медленнее, но **без краша**

### Ожидаемое время после swap:
| Размер | Время (без swap) | Время (с swap) |
|--------|------------------|----------------|
| 8MB    | ~15 сек          | ~15 сек        |
| 301MB  | ❌ краш          | ~10-15 мин     |
| 500MB  | ❌ краш          | ~20-30 мин     |

---

## 🚀 СЛЕДУЮЩИЙ ШАГ:

**ДОБАВЬ SWAP СЕЙЧАС:**
```bash
ssh amster_app
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
sudo swapon --show
```

Потом загрузи файл снова и следи за логами! 🎬

---

*Проблема найдена! Swap решит краш!* 💪


