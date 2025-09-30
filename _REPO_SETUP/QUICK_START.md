# ⚡ Быстрый старт — Git для сервера AMSTER

## 🎯 Что получим

- ✅ Все конфиги и скрипты в Git (AMSTER)
- ✅ Секретные ключи отдельно (AMSTER_KEYS)
- ✅ Простые команды для snapshot/restore
- ✅ История всех изменений
- ✅ Безопасность: оба репо приватные

---

## 📝 Чек-лист

### На GitHub

- [ ] Создать репозиторий `AMSTER` (private)
- [ ] Создать репозиторий `AMSTER_KEYS` (private)

### На локальной машине

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/_REPO_SETUP

# Загружаем AMSTER
cd AMSTER
git init
git add .
git commit -m "initial setup"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER.git
git push -u origin main

# Загружаем AMSTER_KEYS
cd ../AMSTER_KEYS
git init
git add .
git commit -m "initial setup"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER_KEYS.git
git push -u origin main
```

### На сервере

```bash
ssh amster

# Качаем и запускаем настройку
cd /tmp
curl -O https://raw.githubusercontent.com/RaufERK/AMSTER/main/tools/server-init.sh
# Или копируем server-init.sh вручную

chmod +x server-init.sh
sudo ./server-init.sh
```

**Или вручную:**

```bash
ssh amster
cd /root

# Клонируем
git clone git@github.com:RaufERK/AMSTER.git server-configs
git clone git@github.com:RaufERK/AMSTER_KEYS.git server-secrets

# Настраиваем
chmod +x server-configs/tools/*.sh
cd server-configs
./tools/make-snapshot.sh "initial-migration"
```

### Cleanup

```bash
# Удаляем старую папку SERVER_SCRIPS
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD
rm -rf SERVER_SCRIPS
git add .
git commit -m "migrated to AMSTER repos"
git push
```

---

## 🚀 Повседневное использование

### Создать snapshot

```bash
ssh amster
cd /root/server-configs
./tools/make-snapshot.sh "описание изменений"
```

### Восстановить snapshot

```bash
ssh amster
cd /root/server-configs
git tag -l                                    # список
./tools/restore-snapshot.sh <snapshot-name>   # восстановить
```

### Изменить ключ

```bash
ssh amster
cd /root/server-secrets
vim youtube-forward.env
cp youtube-forward.env /etc/default/youtube-forward
systemctl restart youtube-forward@live
git add . && git commit -m "updated key" && git push
```

---

## 📚 Детальная документация

Читать: `SETUP_INSTRUCTIONS.md`

---

## ✅ Всё готово!

Теперь у вас профессиональная система версионирования серверных конфигураций! 🎉
