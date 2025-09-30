# 🎯 НАЧНИ ОТСЮДА!

## ✅ Что уже готово

Я создал полную структуру для версионирования сервера AMSTER:

```
_REPO_SETUP/
├── AMSTER/                 # Конфиги и скрипты (готово к загрузке на GitHub)
├── AMSTER_KEYS/            # Секретные данные (готово к загрузке на GitHub)
├── README.md               # Обзор проекта
├── QUICK_START.md          # Быстрый старт с чек-листом
├── SETUP_INSTRUCTIONS.md   # Детальная инструкция
├── SECURITY.md             # Вопросы безопасности
└── server-init.sh          # Скрипт для сервера
```

---

## 🚀 ЧТО ДЕЛАТЬ ДАЛЬШЕ (пошагово)

### Шаг 1: Создать репозитории на GitHub (5 минут)

1. **Открыть** https://github.com/new
2. **Repository name:** `AMSTER`
3. **Visibility:** ✅ **Private**
4. ❌ НЕ добавлять README/License
5. **Create repository**

6. **Повторить** для второго репозитория:
   - **Repository name:** `AMSTER_KEYS`
   - **Visibility:** ✅ **Private**

---

### Шаг 2: Загрузить файлы (2 минуты)

Открой терминал на **локальной машине**:

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/_REPO_SETUP

# Загрузить AMSTER
cd AMSTER
git init
git add .
git commit -m "initial setup"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER.git
git push -u origin main

# Загрузить AMSTER_KEYS
cd ../AMSTER_KEYS
git init
git add .
git commit -m "initial setup"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER_KEYS.git
git push -u origin main
```

✅ **Готово!** Репозитории на GitHub.

---

### Шаг 3: Настроить на сервере (5 минут)

```bash
# Подключиться к серверу
ssh amster

# Перейти в root
cd /root

# Клонировать оба репозитория
git clone git@github.com:RaufERK/AMSTER.git server-configs
git clone git@github.com:RaufERK/AMSTER_KEYS.git server-secrets

# Настроить Git (укажи свой email)
cd /root/server-configs
git config user.name "RaufERK"
git config user.email "твой-email@example.com"

cd /root/server-secrets
git config user.name "RaufERK"
git config user.email "твой-email@example.com"

# Сделать скрипты исполняемыми
chmod +x /root/server-configs/tools/*.sh
```

---

### Шаг 4: Мигрировать данные (3 минуты)

```bash
# На сервере

# 1. Мигрировать секреты
cd /root/server-secrets
cp /etc/default/youtube-forward youtube-forward.env
cp /etc/default/rutube-forward rutube-forward.env
git add *.env
git commit -m "migrated secrets from server"
git push

# 2. Создать первый snapshot конфигов
cd /root/server-configs
./tools/make-snapshot.sh "initial-migration-from-SERVER_SCRIPS"

# 3. Проверить что всё работает
./tools/check-setup.sh
```

✅ **Готово!** Всё настроено на сервере.

---

### Шаг 5: Cleanup (1 минута)

На **локальной машине**:

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD

# Удалить старую папку SERVER_SCRIPS (теперь всё в Git)
rm -rf SERVER_SCRIPS

# Закоммитить
git add .
git commit -m "migrated to AMSTER repos, removed SERVER_SCRIPS"
git push
```

---

## 🎉 ВСЁ ГОТОВО!

Теперь у тебя профессиональная система версионирования!

### 📝 Повседневное использование:

**Создать snapshot после изменений:**
```bash
ssh amster
cd /root/server-configs
./tools/make-snapshot.sh "описание изменений"
```

**Посмотреть список snapshots:**
```bash
cd /root/server-configs
./tools/list-snapshots.sh
```

**Восстановить snapshot:**
```bash
cd /root/server-configs
./tools/restore-snapshot.sh <snapshot-name>
```

**Изменить API ключ:**
```bash
cd /root/server-secrets
vim youtube-forward.env
cp youtube-forward.env /etc/default/youtube-forward
systemctl restart youtube-forward@live
git add . && git commit -m "updated key" && git push
```

---

## 📚 Документация

- **QUICK_START.md** — быстрый старт с чек-листом
- **SETUP_INSTRUCTIONS.md** — подробная инструкция
- **SECURITY.md** — безопасность

---

## ❓ Есть вопросы?

Читай `SETUP_INSTRUCTIONS.md` — там всё подробно расписано!

**Удачи! 🚀**
