#!/usr/bin/env bash
set -e

HOST="amster_app"
APP_DIR="/home/appuser/apps/spokenword/source"

echo "🚀 Deploying to EU staging (spokenword.guru)..."

# Push local changes first
echo "📤 Pushing to GitHub..."
git push origin master

# Deploy via SSH
ssh "$HOST" bash -s << REMOTE
  set -e
  export NVM_DIR="\$HOME/.nvm"
  [ -s "\$NVM_DIR/nvm.sh" ] && source "\$NVM_DIR/nvm.sh"
  nvm use --lts --silent 2>/dev/null || true
  cd "$APP_DIR"

  echo "📥 Pulling latest..."
  git pull origin master

  echo "📦 Installing dependencies..."
  npm ci --prefer-offline
  cd upload-service && npm ci --prefer-offline && cd ..

  echo "🗄️  Running migrations..."
  npx prisma generate
  npx prisma migrate deploy

  echo "🏗️  Building..."
  npm run build

  echo "🔄 Restarting PM2..."
  pm2 restart spokenword spokenword-upload spokenword-compression-worker

  echo "✅ Done!"
  pm2 list
REMOTE

echo "🎉 EU deployment complete! https://spokenword.guru"
