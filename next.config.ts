// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Игнорируем TypeScript ошибки в продакшне
  },
  async rewrites() {
    return [
      {
        source: '/archive/:file*',
        destination: '/srv/streaming/archive/:file*', // абсолютный путь
      },
    ]
  },
}

export default nextConfig
