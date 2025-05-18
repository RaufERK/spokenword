module.exports = {
  apps: [
    {
      name: 'www.spokenword.ru',
      script: 'npm',
      args: 'run prod',
      cwd: '/var/www/spokenword',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
  deploy: {
    production: {
      user: 'appuser',
      host: '89.111.172.86',
      ref: 'origin/master',
      repo: 'git@github.com:RaufERK/spokenword.git',
      path: '/var/www/spokenword',
      'post-deploy':
        '~/.local/share/pnpm/pnpm install && ~/.local/share/pnpm/pnpm build && pm2 reload ecosystem.config.js --only www.spokenword.ru',
      ssh_options: 'StrictHostKeyChecking=no',
    },
  },
}
