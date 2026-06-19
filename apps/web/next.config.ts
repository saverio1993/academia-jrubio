import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@academia/db', '@academia/storage'],
  // Prisma debe tratarse como paquete externo del servidor.
  serverExternalPackages: ['@prisma/client', 'prisma', 'webdav'],
  // En este monorepo, el motor de Prisma (Query Engine) vive fuera de apps/web,
  // así que ampliamos la raíz de rastreo e incluimos el binario explícitamente
  // para que Next.js lo empaquete en las funciones serverless de Vercel.
  outputFileTracingRoot: path.join(process.cwd(), '..', '..'),
  outputFileTracingIncludes: {
    '/**': [
      '../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/**/*',
      '../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/**/*',
      '../../node_modules/.prisma/client/**/*',
    ],
  },
  // El linter no debe bloquear el build de producción (deploy en Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
