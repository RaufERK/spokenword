# 🚀 Инструкция по настройке Git-репозиториев для сервера AMSTER

## 📋 Что нужно сделать

1. Создать два приватных репозитория на GitHub
2. Загрузить начальные файлы
3. Настроить на сервере
4. Создать первый snapshot
5. Удалить старую папку SERVER_SCRIPS

---

## Шаг 1: Создание репозиториев на GitHub

### 1.1 Создать первый репозиторий (конфиги)

1. Открыть https://github.com/new
2. Repository name: `AMSTER`
3. Description: `Server configurations and scripts`
4. ✅ Private
5. ❌ НЕ добавлять README, .gitignore, license (уже есть локально)
6. Create repository

### 1.2 Создать второй репозиторий (секреты)

1. Открыть https://github.com/new
2. Repository name: `AMSTER_KEYS`
3. Description: `Private credentials and API keys`
4. ✅ Private
5. ❌ НЕ добавлять ничего
6. Create repository

---

## Шаг 2: Загрузка файлов в репозитории

### 2.1 Загрузить AMSTER (конфиги)

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/_REPO_SETUP/AMSTER

git init
git add .
git commit -m "initial setup"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER.git
git push -u origin main
```

### 2.2 Загрузить AMSTER_KEYS (секреты)

```bash
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD/_REPO_SETUP/AMSTER_KEYS

git init
git add .
git commit -m "initial setup"
git branch -M main
git remote add origin git@github.com:RaufERK/AMSTER_KEYS.git
git push -u origin main
```

---

## Шаг 3: Настройка на сервере

### 3.1 Подключиться к серверу

```bash
ssh amster
```

### 3.2 Клонировать репозитории

```bash
cd /root

# Клонируем конфиги
git clone git@github.com:RaufERK/AMSTER.git server-configs

# Клонируем секреты
git clone git@github.com:RaufERK/AMSTER_KEYS.git server-secrets
```

### 3.3 Сделать скрипты исполняемыми

```bash
chmod +x /root/server-configs/tools/*.sh
```

### 3.4 Настроить Git

```bash
cd /root/server-configs
git config user.name "RaufERK"
git config user.email "your-email@example.com"

cd /root/server-secrets
git config user.name "RaufERK"
git config user.email "your-email@example.com"
```

---

## Шаг 4: Миграция данных

### 4.1 Мигрировать секреты

```bash
cd /root/server-secrets

# Копируем текущие ключи
cp /etc/default/youtube-forward youtube-forward.env
cp /etc/default/rutube-forward rutube-forward.env

# Коммитим
git add *.env
git commit -m "migrated from server"
git push
```

### 4.2 Создать первый snapshot конфигов

```bash
cd /root/server-configs
./tools/make-snapshot.sh "initial-migration-from-SERVER_SCRIPS"
```

---

## Шаг 5: Проверка и cleanup

### 5.1 Проверить что всё работает

```bash
# Проверяем что snapshot создался
cd /root/server-configs
git tag -l
ls snapshots/

# Проверяем что секреты закоммичены
cd /root/server-secrets
git log --oneline
```

### 5.2 Удалить старую папку SERVER_SCRIPS (из проекта)

```bash
# На локальной машине
cd /Users/rauferk/Documents/WEB_PROJ/SPOKENWORD
rm -rf SERVER_SCRIPS

# Коммитим удаление
git add .
git commit -m "removed SERVER_SCRIPS - migrated to AMSTER repos"
git push
```

---

## ✅ Готово!

Теперь у вас:

- ✅ Два приватных репозитория на GitHub
- ✅ Конфиги и скрипты версионируются
- ✅ Секреты отдельно и под контролем
- ✅ Удобные команды для snapshot/restore

---

## 🎯 Повседневное использование

### Создать snapshot после изменений

```bash
ssh amster
cd /root/server-configs
./tools/make-snapshot.sh "описание изменений"
```

### Откатиться к предыдущему snapshot

```bash
ssh amster
cd /root/server-configs

# Смотрим доступные snapshots
git tag -l

# Восстанавливаем
./tools/restore-snapshot.sh <snapshot-name>
```

### Изменить API ключ

```bash
ssh amster
cd /root/server-secrets

vim youtube-forward.env
cp youtube-forward.env /etc/default/youtube-forward
systemctl restart youtube-forward@live

git add .
git commit -m "updated YouTube key"
git push
```

---

## 📞 Поддержка

Если что-то пошло не так:

1. Проверить права на файлы: `ls -la`
2. Проверить Git remote: `git remote -v`
3. Проверить SSH ключи: `ssh -T git@github.com`

Все скрипты логируют свои действия — смотрите вывод в терминале.
