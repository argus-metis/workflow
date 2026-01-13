import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
  },
  // Transpile workspace packages
  transpilePackages: ['@workflow/web-shared', '@workflow/utils', '@workflow/core'],
};

export default nextConfig;
