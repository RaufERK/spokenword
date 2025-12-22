# 🐛 ДЕБАГ: Файлы не грузятся

**Дата:** 9 ноября 2025, 14:35  
**Проблема:** Файлы не загружаются через админку

---

## 📊 ЧТО ВИЖУ:

### Процессы:
```
spokenword: 187MB ✅ online (8 минут работы)
video-worker: 13MB ✅ online

Последний restart: 13:26:00
Сейчас: 13:34
→ 8 минут без загрузок!
```

### Логи:
```
13:26:00 ✅ Redis connected
[... тишина 8 минут ...]
```

**НЕТ ЛОГОВ ЗАГРУЗКИ!**

---

## 🔍 ВОЗМОЖНЫЕ ПРИЧИНЫ:

### 1. **Браузер не отправляет запрос**
- Проблема в UI/JS
- Кнопка не работает
- FormData не создаётся

### 2. **Запрос не доходит до API**
- Nginx блокирует
- Next.js не принимает

### 3. **API падает с ошибкой**
- Но нет логов ошибок!

---

## 🧪 ПРОВЕРКИ:

### 1. Проверь браузер (F12):
```
1. Открой админку: /admin/packages
2. Открой DevTools (F12)
3. Вкладка Network
4. Попробуй загрузить файл
5. Смотри есть ли запрос POST /api/admin/packages/upload
6. Что возвращает? 200? 500? Ошибка?
```

### 2. Проверь права доступа:
```bash
ssh amster_app "ls -ld /home/appuser/apps/spokenword/source/paid-content/temp/"
ssh amster_app "ls -ld /home/appuser/apps/spokenword/source/paid-content/packages/"
```

### 3. Проверь размер лимита Nginx:
```bash
ssh amster "grep client_max_body_size /etc/nginx/nginx.conf"
ssh amster "grep client_max_body_size /etc/nginx/sites-enabled/*"
```

---

## 🔧 БЫСТРЫЕ ФИКСЫ:

### Если Nginx блокирует большие файлы:
```bash
ssh amster
sudo nano /etc/nginx/nginx.conf

# Добавь в http {}:
client_max_body_size 5000M;

# Сохрани и перезапусти:
sudo nginx -t
sudo systemctl reload nginx
```

### Если права доступа:
```bash
ssh amster_app
cd /home/appuser/apps/spokenword/source
chmod 755 paid-content/
chmod 755 paid-content/temp/
chmod 755 paid-content/packages/
```

---

## 💡 ЧТО СДЕЛАТЬ СЕЙЧАС:

### 1. Открой DevTools в браузере
Попробуй загрузить файл и смотри что возвращает API

### 2. Скажи мне:
- Есть ли запрос в Network?
- Какой статус код?
- Какая ошибка в Response?

### 3. Или дай мне логи:
```bash
ssh amster_app "source ~/.nvm/nvm.sh && pm2 logs spokenword --lines 100 --nostream | grep -A5 -B5 'upload\|error\|Upload'"
```

---

## 🎯 МОИ ДЕЙСТВИЯ:

Пока ты проверяешь, я:
1. Проверю Nginx конфиг
2. Проверю права доступа
3. Создам тестовый запрос

---

**ПРОВЕРЯЮ ДАЛЬШЕ...**


