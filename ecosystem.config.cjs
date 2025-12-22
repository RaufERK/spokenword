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
    {
      name: 'spokenword-video-worker',
      script: 'node',
      args: '--enable-source-maps --import tsx workers/video-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G', // было '7G'
      // node_args: '--max-old-space-size=2048 --expose-gc', // было 7168
      priority: 5,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: '/home/appuser/logs/video-worker-combined.log',
      out_file: '/home/appuser/logs/video-worker-out.log',
      error_file: '/home/appuser/logs/video-worker-error.log',
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
  ],

  deploy: {
    production: {
      user: 'appuser',
      host: '185.200.178.73',
      ref: 'origin/master',
      repo: 'https://github.com/RaufERK/spokenword.git',
      path: '/home/appuser/apps/spokenword',
      'pre-deploy-local': '',
      'post-deploy': [
        'export NODE_ENV=production',
        'source ~/.nvm/nvm.sh && nvm use --lts',
        // симлинки создаём в КОРНЕ проекта (текущая cwd = /home/appuser/apps/spokenword/source)
        'ln -sfn /home/appuser/apps/spokenword/shared/.env ./.env',
        'ln -sfn /home/appuser/apps/spokenword/shared/.env ./.env.production',
        'npm ci --include=dev',
        'npx prisma generate',
        'npx prisma migrate deploy',
        'npm run build',
        // Примечание: права доступа нужно восстанавливать вручную после деплоя
        // Запустите: ssh amster "bash /root/fix-streaming-permissions.sh"
        'npx pm2 startOrReload ecosystem.config.cjs --env production',
        'npx pm2 save',
      ].join(' && '),

      env: {
        NODE_ENV: 'production',
      },
    },
  },
}
