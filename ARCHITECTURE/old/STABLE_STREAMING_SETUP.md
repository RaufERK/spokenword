# 🎬 Настройка стабильного стриминга

## ✅ Что было сделано

### 1. **Отключена архивация**
- Закомментированы все `record` директивы в nginx
- Отключены внешние скрипты архивации
- Убраны `exec_publish` и `exec_publish_done` команды

### 2. **Упрощена конфигурация**
- Используется только встроенный HLS модуль nginx
- Убраны сложные внешние скрипты
- Минимальная конфигурация для стабильности

### 3. **Решена проблема со звуком**
- Создан скрипт `start-hls-stable.sh` с решением проблемы аудио
- Используется `-map 0:a` для всех аудиодорожек
- Гарантирует наличие звука даже при переключении треков

## 🔧 Текущая конфигурация

### **Nginx RTMP (упрощенная):**
```nginx
application live {
    live on;
    
    # Встроенный HLS модуль nginx
    hls on;
    hls_path /srv/streaming/live;
    hls_fragment 2s;
    hls_playlist_length 60s;
    hls_continuous on;
    hls_cleanup on;
    hls_nested off;
    
    # Архивирование ОТКЛЮЧЕНО
    # record all;
    # record_path /srv/streaming/archive;
    # record_suffix .flv;
    # record_unique on;
    
    # Внешние скрипты ОТКЛЮЧЕНЫ
    # exec_publish /usr/local/bin/start-stream-services.sh $name;
    # exec_publish_done /usr/local/bin/stop-stream-services.sh $name;
    
    # Настройки для стабильности
    drop_idle_publisher 0;
    idle_streams off;
}
```

## 🎯 Настройки OBS Studio

### **Основной стрим:**
- **Сервер:** `rtmp://185.200.178.73/live`
- **Ключ потока:** `main`

### **Рекомендуемые настройки OBS:**
- **Битрейт видео:** 3000 kbps
- **Битрейт аудио:** 128 kbps
- **Разрешение:** 1280x720
- **FPS:** 30

## 🌐 URL для просмотра

### **Веб-интерфейс:**
- **Главная:** https://www.spoken-word.ru/
- **Стрим:** https://spoken-word.ru/live

### **Прямые ссылки:**
- **HLS плейлист:** https://spoken-word.ru/live/main/index.m3u8
- **Сегменты:** https://spoken-word.ru/live/main-0.ts

## 🔍 Проверка работы

### **API статуса:**
```bash
curl "https://spoken-word.ru/api/stream-status?key=main"
```

### **HLS файл:**
```bash
curl -I "https://spoken-word.ru/live/main/index.m3u8"
```

### **Сегменты:**
```bash
curl -I "https://spoken-word.ru/live/main-0.ts"
```

## 🛠️ Устранение неполадок

### **Если стрим не работает:**

1. **Проверьте статус nginx:**
   ```bash
   ssh amster "sudo systemctl status nginx"
   ```

2. **Проверьте RTMP сервер:**
   ```bash
   ssh amster "netstat -tlnp | grep 1935"
   ```

3. **Создайте символические ссылки:**
   ```bash
   ssh amster "bash /root/fix-hls-symlinks.sh"
   ```

4. **Восстановите права доступа:**
   ```bash
   npm run fix-streaming
   ```

### **Если стрим отключается при отсутствии звука:**

Проблема решена встроенным HLS модулем nginx, который не зависит от внешних скриптов.

## 📁 Структура файлов

```
/srv/streaming/live/
├── main.m3u8              # Основной плейлист (создается nginx)
├── main-0.ts              # Сегменты видео (создаются nginx)
├── main-1.ts
├── main-2.ts
└── main/                  # Папка для API
    ├── index.m3u8         # Символическая ссылка
    ├── main-0.ts          # Символические ссылки
    ├── main-1.ts
    └── main-2.ts
```

## 🚀 Процесс деплоя

### **Автоматический деплой:**
```bash
npm run deploy:full
```

**Что происходит:**
1. Деплой приложения
2. Восстановление прав доступа
3. Создание символических ссылок
4. Готово к работе!

## 🎊 Результат

**Стабильный стриминг без архивации:**
- ✅ Простая конфигурация
- ✅ Встроенный HLS модуль nginx
- ✅ Решена проблема со звуком
- ✅ Отключена архивация
- ✅ Автоматическое создание ссылок
- ✅ Стабильная работа

## 🔄 Включение архивации позже

Когда стриминг стабилизируется, можно будет включить архивацию:

1. Раскомментировать `record` директивы в nginx
2. Включить `exec_publish` команды
3. Установить systemd сервисы архивации

---

**Теперь стриминг работает стабильно и просто!** 🚀

