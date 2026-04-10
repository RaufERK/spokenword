# 🚀 Deployment Status -- Spoken Word Project

## ✅ Current Infrastructure

### 🌍 Servers

-   **EU (Amsterdam)**: `185.200.178.73`
-   **RU (New server)**: `155.212.174.133`

### 🌐 DNS Configuration

-   `@` → 185.200.178.73
-   `www` → 185.200.178.73
-   `audio` → 185.200.178.73
-   `stream` → 185.200.178.73
-   `eu` → 185.200.178.73
-   `ru` → 155.212.174.133 ✅

------------------------------------------------------------------------

## 🔐 Access & SSH

### ✅ Local → Servers

Configured on Mac: - `sw` → root@RU - `app` → appuser@RU - `amster` →
root@EU - `amster_app` → appuser@EU

### ✅ RU Server → GitHub

-   SSH key created under `appuser`
-   GitHub access works: ssh -T git@github.com

### ✅ RU Server → EU Server

-   SSH key added to EU `authorized_keys`
-   Alias configured: ssh amster_app

------------------------------------------------------------------------

## ⚙️ Server Setup (RU)

-   Ubuntu 24.04
-   nginx installed and running
-   Node.js installed via nvm
-   PM2 installed and working
-   SSH timeout configured

------------------------------------------------------------------------

## 📦 Deployment Architecture

Using PM2 deploy (capistrano-like): - source/ - shared/ - current/

Deployment managed via: ecosystem.config.cjs

------------------------------------------------------------------------

## 🎯 Current Goal

-   Add RU server as a new deploy target
-   Use existing deployment system (PM2 deploy)
-   Avoid manual rsync / copying

------------------------------------------------------------------------

## 🔧 Next Steps

### 1. Update ecosystem.config.cjs

Add new environment:

deploy: { ru: { user: "appuser", host: "155.212.174.133", ref:
"origin/main", repo: "git@github.com:YOUR_REPO.git", path:
"/home/appuser/apps/spoken", "post-deploy": "npm install && npm run
build && pm2 reload ecosystem.config.cjs --env production" } }

------------------------------------------------------------------------

### 2. First Deploy

pm2 deploy ecosystem.config.cjs ru setup\
pm2 deploy ecosystem.config.cjs ru

------------------------------------------------------------------------

### 3. Verify

pm2 list\
curl localhost:3000

------------------------------------------------------------------------

## ⚠️ Not Yet Configured

-   nginx reverse proxy ❌
-   SSL (Let's Encrypt) ❌
-   domain binding ❌

------------------------------------------------------------------------

## 🧠 Strategy

1.  Ensure app runs on localhost
2.  Then configure nginx
3.  Then enable SSL
4.  Then switch traffic if needed

------------------------------------------------------------------------

## 🔥 Summary

Infrastructure is ready: - DNS ✔ - SSH ✔ - Git ✔ - Server ✔

Next step: clean deploy via PM2
