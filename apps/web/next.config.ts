import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@academia/db', '@academia/storage'],
  // El linter no debe bloquear el build de producción (deploy en Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
