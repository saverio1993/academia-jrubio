import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@academia/db', '@academia/storage'],
  // Prisma debe tratarse como paquete externo del servidor para que el motor
  // (Query Engine) se cargue desde node_modules en runtime (Vercel serverless).
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // El linter no debe bloquear el build de producción (deploy en Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
