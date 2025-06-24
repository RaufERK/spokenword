module.exports = {
  apps: [
    {
      name: 'www.spokenword.ru',
      script: 'npm',
      args: 'run prod',
      cwd: '/var/www/spokenword/current',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss', // ← вот это
    },
  ],
  deploy: {
    production: {
      user: 'appuser',
      host: '89.111.172.86',
      ref: 'origin/master',
      repo: 'git@github.com:RaufERK/spokenword.git',
      postDeploy:
        'export PATH=$HOME/.nvm/versions/node/v22.15.1/bin:$PATH && pnpm install && pnpm prisma generate && pnpm prisma migrate deploy && pnpm build && pm2 reload ecosystem.config.cjs --only www.spokenword.ru',
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
}
