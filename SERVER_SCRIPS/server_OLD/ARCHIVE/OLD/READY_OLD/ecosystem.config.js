module.exports = {
  apps: [
    {
      name: 'spokenword-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/spokenword',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
