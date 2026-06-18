import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@academia/db', '@academia/storage'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
