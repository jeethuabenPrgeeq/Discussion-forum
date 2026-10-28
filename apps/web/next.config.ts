import path from 'node:path';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(__dirname, '..', '..');
const apiTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: { root: monorepoRoot },
  outputFileTracingRoot: monorepoRoot,
  async rewrites() {
    return apiTarget ? [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }] : [];
  },
};

export default nextConfig;