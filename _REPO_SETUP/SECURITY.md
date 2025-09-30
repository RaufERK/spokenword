# 🔐 Безопасность и Best Practices

## ✅ Что сделано для безопасности

### 1. Разделение репозиториев
- **AMSTER** — конфиги и скрипты (можно показать другим)
- **AMSTER_KEYS** — только секретные ключи (строго приватно)

### 2. .gitignore
Все секретные файлы исключены из AMSTER:
```
*.env
**/default/youtube-forward
**/default/rutube-forward
secrets/
*.key
*.pem
```

### 3. Private репозитории
Оба репозитория на GitHub — **Private**

### 4. SSH доступ
Используем SSH ключи для доступа к GitHub (безопаснее паролей)

---

## 🛡️ Дополнительные меры (опционально)

### GPG подписи коммитов

```bash
# Генерируем GPG ключ
gpg --full-generate-key

# Настраиваем Git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Теперь все коммиты будут подписаны
```

### GitHub 2FA

Включить двухфакторную аутентификацию на GitHub для дополнительной защиты.

### Backup ключей офлайн

```bash
# Зашифрованный backup на флешку/внешний диск
cd /root/server-secrets
tar czf - *.env | gpg -c > /path/to/backup/secrets-$(date +%Y-%m-%d).tar.gz.gpg
```

---

## ⚠️ Что НЕ делать

❌ Не коммитить `.env` файлы в AMSTER
❌ Не логировать содержимое секретных файлов
❌ Не делать форки приватных репо в публичные
❌ Не клонировать AMSTER_KEYS на локальные машины (только на сервер)
❌ Не давать access token с правами на оба репо (раздельный доступ)

---

## 🔍 Проверка безопасности

### Проверить что секреты не в Git

```bash
cd /root/server-configs
git log -p | grep -i "youtube_key\|rutube_key"
# Должно быть пусто
```

### Проверить права на файлы

```bash
ls -la /etc/default/*-forward
# Должно быть: -rw------- (600) root root
```

### Проверить что репо приватные

GitHub → Settings → Danger Zone → Change visibility → должно быть Private

---

## 🚨 При утечке ключа

1. **Немедленно** сменить ключ на YouTube/RuTube
2. Обновить в `server-secrets`
3. Закоммитить новый ключ
4. Проверить Git историю — старый ключ остается в истории!
5. Если нужно — удалить историю:

```bash
cd /root/server-secrets
# Создать новый репо без истории
git checkout --orphan temp_branch
git add -A
git commit -m "cleaned history after key leak"
git branch -D main
git branch -m main
git push -f origin main
```

---

## 📞 Контакты

При вопросах по безопасности — проконсультироваться с DevSecOps специалистом.
