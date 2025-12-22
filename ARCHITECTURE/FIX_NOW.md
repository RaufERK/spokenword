# ⚡ БЫСТРЫЙ ФИКС - СДЕЛАЙ СЕЙЧАС!

## 🔍 ДИАГНОЗ:

**Проблема:** Worker крашит на 301MB файле  
**Причина:** **НЕТ SWAP!** OOM killer убивает процесс  
**Решение:** Добавить 4GB swap (5 минут)

---

## 🚀 РЕШЕНИЕ (КОПИРУЙ И ВСТАВЛЯЙ):

### Вариант 1: Автоматический скрипт
```bash
ssh amster_app 'bash -s' < add-swap-to-server.sh
```

### Вариант 2: Ручные команды (если скрипт не работает)
```bash
ssh amster_app

# Создаём swap 4GB
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Проверяем
free -h
sudo swapon --show

# Делаем постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Выходим
exit
```

---

## 🧪 ТЕСТ ПОСЛЕ SWAP:

### 1. Очисть зависший файл:
```bash
ssh amster_app "redis-cli DEL 'upload:2:20251011191302_5df598.mp4'"
```

### 2. Загрузи файл снова:
- Открой: https://spokenword.ru/admin/packages
- Загрузи файл: `20251011191302_5df598.mp4` (301MB)

### 3. Следи за логами:
```bash
ssh amster_app "source ~/.nvm/nvm.sh && pm2 logs video-worker --lines 0"
```

Должно быть:
```
🎬 Начинаем сжатие: 20251011191302_5df598.mp4
📊 Размер: 301MB
[... обработка 10-15 минут ...]
📉 Сжатие: 301MB → ~80MB
✅ Готово!
```

### 4. Мониторь память (в другом терминале):
```bash
ssh amster_app "watch -n 5 'free -h'"
```

---

## 📊 ПОЧЕМУ SWAP РЕШИТ ПРОБЛЕМУ:

### Было:
```
RAM:  7.7GB
Swap: 0GB  ← ПРОБЛЕМА!

Worker (60MB) + FFmpeg (3-4GB) = 4GB нужно
Свободно: 2.8GB
Результат: OOM killer → КРАШ!
```

### Станет:
```
RAM:  7.7GB
Swap: 4GB  ← РЕШЕНИЕ!

Worker (60MB) + FFmpeg (3-4GB) = 4GB нужно
Свободно: 2.8GB RAM + 4GB Swap = 6.8GB
Результат: ✅ Работает!
```

---

## ⏱️ ОЖИДАЕМОЕ ВРЕМЯ:

| Размер | Без swap | С swap |
|--------|----------|--------|
| 8MB    | 15 сек   | 15 сек |
| 301MB  | ❌ краш  | ✅ 10-15 мин |
| 500MB  | ❌ краш  | ✅ 20-30 мин |
| 1GB    | ❌ краш  | ✅ 40-60 мин |

---

## 🎯 ИТОГО:

1. **Добавь swap** (5 минут)
2. **Очисть зависший файл** (1 команда)
3. **Загрузи файл снова** (через админку)
4. **Следи за логами** (должен обработаться за 10-15 мин)

---

## 📚 ДОКУМЕНТАЦИЯ:

- `DIAGNOSIS_VIDEO_CRASH.md` - подробный диагноз
- `add-swap-to-server.sh` - скрипт добавления swap
- `VIDEO_CRASH_FIX.md` - инструкции по фиксу
- `STATUS_AFTER_FIX.md` - текущий статус

---

**НАЧИНАЙ С ДОБАВЛЕНИЯ SWAP! ⚡**

Потом пиши результат! 🚀


