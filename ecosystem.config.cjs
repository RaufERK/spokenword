const postDeploySteps = [
  'export NODE_ENV=production',
  'source ~/.nvm/nvm.sh && nvm use v24.12.0',
  // симлинки создаём в КОРНЕ проекта (текущая cwd = /home/appuser/apps/spokenword/source)
  'ln -sfn /home/appuser/apps/spokenword/shared/.env ./.env',
  'ln -sfn /home/appuser/apps/spokenword/shared/.env ./.env.production',
  'mkdir -p ./public',
  'mkdir -p /home/appuser/apps/spokenword/shared/public/news-media',
  'ln -sfn /home/appuser/apps/spokenword/shared/public/conf-archive ./public/conf-archive',
  'ln -sfn /home/appuser/apps/spokenword/shared/public/news-media ./public/news-media',
  'npm ci --include=dev',
  'cd upload-service && npm ci && cd ..',
  './node_modules/.bin/prisma generate',
  './node_modules/.bin/prisma migrate deploy',
  // Удаляем symlinks перед билдом (Turbopack не поддерживает внешние symlinks)
  'rm -rf ./paid-content',
  'npm run build',
  // Восстанавливаем symlinks после билда
  'ln -sfn /home/appuser/apps/spokenword/shared/paid-content ./paid-content',
  // Примечание: права доступа нужно восстанавливать вручную после деплоя
  // Запустите: ssh amster "bash /root/fix-streaming-permissions.sh"
  'pm2 startOrReload ecosystem.config.cjs --env production',
  'pm2 save',
].join(' && ')

module.exports = {
  apps: [
    {
      name: 'spokenword',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G', // было '6G'
      // node_args: '--max-old-space-size=1024', // было 6144
      priority: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: '/home/appuser/logs/spokenword-combined.log',
      out_file: '/home/appuser/logs/spokenword-out.log',
      error_file: '/home/appuser/logs/spokenword-error.log',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
      },
    },
    // NOTE: spokenword-video-worker removed - not used anymore
    // Upload service now handles both upload and compression
    // Old worker files kept in /workers/ as reference/example code
    {
      name: 'spokenword-compression-worker',
      cwd: '/home/appuser/apps/spokenword/source/upload-service',
      script: '/home/appuser/apps/spokenword/source/node_modules/.bin/tsx',
      args: 'workers/compression-worker.ts',
      interpreter: 'none',
      exec_mode: 'fork',
      autorestart: true,
      instances: 1,
      watch: false,
      max_memory_restart: '2G',
      priority: 5,
      max_restarts: 10,
      min_uptime: '10s',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: '/home/appuser/logs/compression-worker-combined.log',
      out_file: '/home/appuser/logs/compression-worker-out.log',
      error_file: '/home/appuser/logs/compression-worker-error.log',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: '6379',
      },
    },
    {
      name: 'spokenword-upload',
      cwd: '/home/appuser/apps/spokenword/source/upload-service',
      script: '/home/appuser/apps/spokenword/source/node_modules/.bin/tsx',
      args: 'index.ts',
      interpreter: 'none',
      exec_mode: 'fork',
      autorestart: true,
      instances: 1,
      watch: false,
      max_memory_restart: '512M',
      priority: 8,
      max_restarts: 10,
      min_uptime: '10s',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: '/home/appuser/logs/upload-service-combined.log',
      out_file: '/home/appuser/logs/upload-service-out.log',
      error_file: '/home/appuser/logs/upload-service-error.log',
      env: {
        NODE_ENV: 'production',
        UPLOAD_SERVICE_PORT: '3006',
      },
      env_production: {
        NODE_ENV: 'production',
        UPLOAD_SERVICE_PORT: '3006',
      },
    },
  ],

  deploy: {
    // Новый основной сервер (sw / 155.212.174.133) — spoken-word.ru
    production: {
      user: 'appuser',
      host: '155.212.174.133',
      ref: 'origin/master',
      repo: 'git@github.com:RaufERK/spokenword.git',
      path: '/home/appuser/apps/spokenword',
      'pre-deploy-local': '',
      'post-deploy': postDeploySteps,

      env: {
        NODE_ENV: 'production',
      },
    },
    // EU сервер (amster / 185.200.178.73) — nginx-only gateway, код не деплоится
    // Управление: ssh amster → /etc/nginx/sites-available/spoken-word.info
    // Rollback: rm /etc/nginx/sites-enabled/spoken-word.info && nginx -t && systemctl reload nginx
  },
}
