# 🚀 Git-версионирование для сервера AMSTER

Профессиональная система версионирования серверных конфигураций и скриптов.

---

## 📦 Что здесь

```
_REPO_SETUP/
├── AMSTER/                      # → git@github.com:RaufERK/AMSTER.git
│   ├── snapshots/               # Рабочие конфигурации
│   ├── tools/                   # Скрипты управления
│   │   ├── make-snapshot.sh
│   │   └── restore-snapshot.sh
│   ├── .gitignore
│   └── README.md
│
├── AMSTER_KEYS/                 # → git@github.com:RaufERK/AMSTER_KEYS.git
│   ├── youtube-forward.env      # (добавится при миграции)
│   ├── rutube-forward.env       # (добавится при миграции)
│   ├── .env.example
│   ├── DEPLOY.md
│   └── README.md
│
├── QUICK_START.md               # ⚡ Начни отсюда!
├── SETUP_INSTRUCTIONS.md        # 📖 Детальная инструкция
├── SECURITY.md                  # 🔐 Безопасность
├── server-init.sh               # Скрипт для сервера
└── README.md                    # Этот файл
```

---

## 🎯 Быстрый старт

### 1️⃣ На GitHub
Создать два **private** репозитория:
- `AMSTER`
- `AMSTER_KEYS`

### 2️⃣ На локальной машине
```bash
cd _REPO_SETUP

# Загрузить AMSTER
cd AMSTER
git init && git add . && git commit -m "initial"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER.git
git push -u origin main

# Загрузить AMSTER_KEYS
cd ../AMSTER_KEYS
git init && git add . && git commit -m "initial"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER_KEYS.git
git push -u origin main
```

### 3️⃣ На сервере
```bash
ssh amster
cd /root
git clone git@github.com:RaufERK/AMSTER.git server-configs
git clone git@github.com:RaufERK/AMSTER_KEYS.git server-secrets
cd server-configs
chmod +x tools/*.sh
./tools/make-snapshot.sh "initial-migration"
```

### 4️⃣ Cleanup
```bash
# Удалить старую папку
rm -rf SERVER_SCRIPS
git add . && git commit -m "migrated to AMSTER repos" && git push
```

---

## 📚 Документация

- **QUICK_START.md** — быстрый старт с чек-листом
- **SETUP_INSTRUCTIONS.md** — подробная инструкция со всеми шагами
- **SECURITY.md** — вопросы безопасности и best practices

---

## 💡 Концепция

### Два репозитория

1. **AMSTER** (конфиги и скрипты)
   - Nginx конфигурации
   - Systemd units
   - Bash-скрипты
   - Права sudo
   - **БЕЗ секретных данных**

2. **AMSTER_KEYS** (только секреты)
   - API ключи
   - Токены доступа
   - Credentials
   - **Отдельный контроль доступа**

### Workflow

```
Изменили конфиг → Протестировали → Работает ✅
↓
./tools/make-snapshot.sh "описание"
↓
Git коммитит + тег + push в GitHub
```

### Restore

```bash
git tag -l                              # список snapshots
./tools/restore-snapshot.sh <name>      # откат
```

---

## ✅ Преимущества

- ✅ История всех изменений
- ✅ Откат к любой рабочей версии
- ✅ Безопасность: секреты отдельно
- ✅ Простота: 1 команда для snapshot
- ✅ Backup в облаке (GitHub)
- ✅ Удобная миграция на новый сервер

---

## 🔗 Репозитории

- **AMSTER**: https://github.com/RaufERK/AMSTER (private)
- **AMSTER_KEYS**: https://github.com/RaufERK/AMSTER_KEYS (private)

---

## 📞 Поддержка

Если что-то непонятно — читай `SETUP_INSTRUCTIONS.md`

**Всё готово к использованию! 🎉**
