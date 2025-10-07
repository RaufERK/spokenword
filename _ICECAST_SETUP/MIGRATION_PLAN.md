# 🎯 План миграции на Icecast

## Текущая ситуация

### Что работает:
- ✅ Видео-стрим через HLS на `/live`
- ⚠️ Аудио через HLS на `/audio` (проблемы на мобильных)

### Проблемы:
- ❌ Аудио HLS не работает стабильно на мобильных
- ❌ Большая задержка (4-12 сек)
- ❌ Обрывы и буферизация

---

## Решение: Icecast для аудио

### Что меняется:

**Видео:**
```
OBS → nginx-rtmp → HLS → /live
```
✅ Остаётся без изменений

**Аудио:**
```
OBS → nginx-rtmp → ffmpeg → Icecast → /audio-stream/main
```
🆕 Новая схема

---

## Этапы миграции

### Этап 1: Подготовка (уже готово ✅)

- ✅ Созданы все конфигурационные файлы
- ✅ Написаны скрипты установки
- ✅ Обновлён frontend (IcecastPlayer)
- ✅ Документация готова

### Этап 2: Установка на сервер (15 мин)

**Действия:**
1. Загрузить файлы на сервер
2. Запустить `install-icecast.sh`
3. Обновить nginx конфигурацию (2 блока)
4. Перезагрузить nginx

**Риски:** Минимальные
**Откат:** Просто вернуть старую nginx конфигурацию

### Этап 3: Деплой frontend (5 мин)

**Действия:**
1. Коммит изменений
2. Push в GitHub
3. Деплой на сервер

**Риски:** Нет
**Откат:** `git revert` + повторный деплой

### Этап 4: Тестирование (10 мин)

**Проверить:**
- [ ] Icecast запущен
- [ ] Видео работает (HLS)
- [ ] Аудио работает (Icecast)
- [ ] Мобильные устройства (iOS, Android)
- [ ] Desktop (Chrome, Safari, Firefox)

### Этап 5: Мониторинг (первые сутки)

**Следить за:**
- Логи Icecast (`/var/log/icecast2/`)
- Логи nginx (`/var/log/nginx/`)
- Отзывы пользователей

---

## Что НЕ меняется

✅ OBS настройки (те же RTMP параметры)  
✅ Видео-стрим на `/live` (работает как раньше)  
✅ Архивация стримов  
✅ База данных  
✅ Авторизация

---

## Совместимость

### Браузеры:

**Desktop:**
- ✅ Chrome/Edge (Windows, macOS, Linux)
- ✅ Firefox (Windows, macOS, Linux)
- ✅ Safari (macOS)

**Mobile:**
- ✅ iOS Safari (iPhone, iPad)
- ✅ Android Chrome
- ✅ Android Firefox

### Форматы:

**Icecast:** MP3 (128 kbps, стерео, 44.1 kHz)  
**HLS (видео):** H.264 + AAC (как раньше)

---

## План отката (если что-то пойдёт не так)

### Вариант 1: Откат nginx (быстрый)

```bash
# Убрать из nginx.conf строки Icecast
sudo nano /etc/nginx/nginx.conf
# Удалить: exec_publish/exec_publish_done

# Убрать proxy из sites-available
sudo nano /etc/nginx/sites-available/spoken-word.ru
# Удалить: location /audio-stream/

# Перезагрузить
sudo nginx -t && sudo systemctl reload nginx
```

### Вариант 2: Откат frontend

```bash
git revert HEAD
git push
npm run deploy
```

### Вариант 3: Полный откат

```bash
# Остановить Icecast
sudo systemctl stop icecast2
sudo systemctl disable icecast2

# Откатить nginx + frontend (см. выше)
```

---

## Сохранение конфигурации

После успешной установки:

```bash
# Сохранить пароли в AMSTER_KEYS
ssh amster
cd /root/server-secrets
cp /root/icecast-passwords.txt .
git add icecast-passwords.txt
git commit -m "added icecast passwords"
git push

# Создать snapshot
cd /root/server-configs
./tools/make-snapshot.sh "добавлен Icecast2 для аудио-стриминга"
```

---

## Показатели успеха

### Критерии:

- ✅ Аудио работает на iOS Safari
- ✅ Аудио работает на Android Chrome
- ✅ Задержка < 3 секунд
- ✅ Нет обрывов при нормальном интернете
- ✅ Простой плеер (работает без HLS.js)

### Метрики:

**Текущие (HLS):**
- Задержка: 4-12 сек
- Стабильность: 70% (проблемы на мобильных)

**Целевые (Icecast):**
- Задержка: 1-3 сек
- Стабильность: 95%+

---

## Временные затраты

| Этап | Время | Кто |
|------|-------|-----|
| Установка | 15 мин | Админ на сервере |
| Деплой | 5 мин | Локально + сервер |
| Тестирование | 10 мин | Вручную |
| **Итого** | **30 мин** | |

---

## Следующие шаги

### 1. Готов к установке? ✅

Читай **QUICK_START.md** и начинай!

### 2. Нужны детали?

Читай **README.md** (полная документация)

### 3. Проблемы?

Смотри раздел "Решение проблем" в **README.md**

---

## ✅ Всё готово к миграции!

Icecast — проверенное решение для аудио-стриминга.  
Один раз настроить и жить спокойно! 🚀











