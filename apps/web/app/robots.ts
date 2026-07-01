import type { MetadataRoute } from 'next';

const APP_URL = (process.env.APP_URL ?? 'https://academia-jrubio-web.vercel.app').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/api',
        '/api/*',
        '/dashboard',
        '/archivos',
        '/perfil',
        '/perfil/*',
        '/favoritos',
        '/mis-descargas',
        '/checkout',
        '/checkout/*',
        '/planes',
        '/registro',
        '/signin',
        '/tg',
        '/tg/*',
        '/comunidad/guardados',
        '/comunidad/crear',
        '/comunidad/*/editar',
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
