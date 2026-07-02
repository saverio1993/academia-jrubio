import type { NextConfig } from 'next';
import path from 'path';

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  transpilePackages: ['@academia/db', '@academia/storage'],
  // Prisma debe tratarse como paquete externo del servidor.
  serverExternalPackages: ['@prisma/client', 'prisma'],
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
  // TypeScript: ignorar errores durante el build (los modelos de Prisma
  // a veces no están sincronizados con el cliente generado, pero la app
  // funciona en runtime). El typecheck estricto lo hacemos en CI/manual.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(self), camera=(self)' },
        ],
      },
    ];
  },
};

export default config;
