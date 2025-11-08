module.exports = {
  apps: [
    {
      name: 'spokenword',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '4G', // Увеличиваем до 4GB для обработки больших видео
      node_args: '--max-old-space-size=4096 --expose-gc', // Node.js heap до 4GB + garbage collector
      priority: 10, // Высокий приоритет процесса
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_file: '/home/appuser/logs/spokenword-combined.log',
      out_file: '/home/appuser/logs/spokenword-out.log',
      error_file: '/home/appuser/logs/spokenword-error.log',
      env: {
        NODE_ENV: 'production',
        UV_THREADPOOL_SIZE: '8', // Увеличиваем пул потоков для I/O операций
      },
      env_production: {
        NODE_ENV: 'production',
        UV_THREADPOOL_SIZE: '8',
      },
    },
  ],

  deploy: {
    production: {
      user: 'appuser',
      host: '185.200.178.73',
      ref: 'origin/master',
      repo: 'git@github.com:RaufERK/spokenword.git',
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
        'pm2 startOrReload ecosystem.config.cjs --env production',
        'pm2 save',
      ].join(' && '),

      env: {
        NODE_ENV: 'production',
      },
    },
  },
}
