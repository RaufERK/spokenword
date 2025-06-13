// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
