# SpokenWord Deployment & Management Guide

This is a quick-reference and deployment helper for maintaining the **SpokenWord** project on the production server.

---

## 🧹 Cleanup & Reset

### Manually remove archive recordings:
```bash
rm -f public/archive/*
```

### Pre-deploy clean-up (inside deploy script):
```bash
sudo -u spokenword -H bash
rm -f public/live/*
sudo chown -R spokenword:spokenword public/{live,archive}
```

---

## 🚀 Deployment

### Step-by-step:
```bash
git pull
npm ci                # if lockfile has changed
npm run build
pm2 restart spokenword-frontend
pm2 logs --lines 20
```

### Full deploy with service restart:
```bash
sudo -u spokenword -H bash
cd /var/www/spokenword
git pull && npm ci && npm run build
pm2 restart 0
sudo systemctl restart stream            # only if stream script or ffmpeg changed
exit
sudo /usr/local/bin/make-master.sh       # regenerate master.m3u8 playlist
```

---

## 🔁 Stream Service Control

```bash
sudo systemctl restart stream
sudo systemctl status stream --no-pager -l
```

---

## 🧪 Stream Status Checks

### Local:
```bash
curl -s http://localhost:3000/api/status
```

### From outside:
```bash
curl -s https://spoken-word.ru/api/status
```

---

## ⚙️ Nginx Configuration

Edit:
```
/etc/nginx/sites-enabled/spoken-word.ru
```

---

## 🛣️ Future Improvements

- Enable HTTPS (Let’s Encrypt) for HLS.
- Auto-generate `master.m3u8` on stream start.
- Add alternate bitrate or subtitle track.
- CI deploy script to automate all updates.