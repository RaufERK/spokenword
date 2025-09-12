module.exports = {
  apps: [
    {
      name: 'spokenword',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
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
        'pm2 startOrReload ecosystem.config.cjs --env production',
        'pm2 save',
      ].join(' && '),

      env: {
        NODE_ENV: 'production',
      },
    },
  },
}
