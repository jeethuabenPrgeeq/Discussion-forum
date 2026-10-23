import path from 'node:path';
import type { NextConfig } from 'next';

const monorepoRoot = path.join(__dirname, '..', '..');

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: { root: monorepoRoot },
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;